import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';

// You'll need to set these environment variables or replace with actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing required environment variables.');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

interface MentorData {
  'Timestamp': string;
  'Score': string;
  'What is your Full Name?': string;
  'What is your Email?': string;
  'Which University do you/did you/will you attend?': string;
  'What is your course? (Name and Year of Study)': string;
  'What tutoring/mentoring experience do you have?': string;
  'What is your Phone Number?': string;
}

interface MentorUpsertData {
  id: string;
  bio: string | null;
  embedding?: string;
  status: 'active' | 'pending_approval' | 'details_required';
  responses?: Record<string, unknown>;
  phone?: string | null;
}

// Parse CSV data correctly handling quoted fields with commas and newlines
function parseCSV(csvContent: string): MentorData[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else {
        // Toggle quotes
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      // Row separator
      if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      }
      // Handle \r\n
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentField += char;
    }
  }

  // Add the last field/row if exists
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0];
  const mentorData: MentorData[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const item: any = {};
    headers.forEach((header, index) => {
      item[header] = row[index] || '';
    });
    if (Object.keys(item).length > 0 && (item['What is your Full Name?'] || item['What is your Email?'])) {
      mentorData.push(item as MentorData);
    }
  }

  return mentorData;
}

// Generate a temporary password for mentors
function generateTempPassword(): string {
  return 'TempPass' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function importMentors(csvFilePath?: string): Promise<void> {
  try {
    // Get CSV file path from CLI args or use default
    const csvPath = csvFilePath || join(__dirname, 'mentors-temp-db.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');

    const mentors = parseCSV(csvContent);
    console.log(`Found ${mentors.length} mentor records in CSV`);

    // Fetch all existing users to avoid redundant lookups
    console.log('Fetching existing auth users...');
    const existingUsersMap = new Map<string, string>();
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage
      });

      if (error) {
        console.error('Error fetching auth users:', error);
        break;
      }

      data.users.forEach(user => {
        if (user.email) existingUsersMap.set(user.email.toLowerCase(), user.id);
      });

      if (data.users.length < perPage) break;
      page++;
    }
    console.log(`Found ${existingUsersMap.size} existing auth users`);

    let successCount = 0;
    let errorCount = 0;

    for (const mentor of mentors) {
      try {
        const name = mentor['What is your Full Name?'];
        const email = mentor['What is your Email?']?.toLowerCase().trim();
        const experience = mentor['What tutoring/mentoring experience do you have?'];
        const university = mentor['Which University do you/did you/will you attend?'];
        const course = mentor['What is your course? (Name and Year of Study)'];
        const phone = mentor['What is your Phone Number?'];

        // Skip if missing essential data
        if (!name || !email) {
          console.log(`Skipping mentor with missing name or email: ${name || 'No name'} - ${email || 'No email'}`);
          errorCount++;
          continue;
        }

        console.log(`Processing mentor: ${name} (${email})`);

        let userId: string;

        // Check if user already exists
        if (existingUsersMap.has(email)) {
          userId = existingUsersMap.get(email)!;
          console.log(`User ${email} already exists with ID: ${userId}`);
        } else {
          // Create auth user
          const tempPassword = generateTempPassword();
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: name,
              role: 'mentor'
            }
          });

          if (authError) {
            console.error(`Error creating auth user for ${email}:`, authError);
            errorCount++;
            continue;
          }

          userId = authData.user!.id;
          existingUsersMap.set(email, userId);
          console.log(`Created auth user with ID: ${userId}`);
        }

        // Create or update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            full_name: name,
            email: email,
            role: 'mentor'
          });

        if (profileError) {
          console.error(`Error upserting profile for ${email}:`, profileError);
          errorCount++;
          continue;
        }

        // Generate embedding for mentor bio (OPTIONAL)
        let embedding: number[] | null = null;
        if (experience && experience.trim()) {
          try {
            console.log(`Generating embedding for ${name}...`);
            const embeddingResponse = await openai.embeddings.create({
              model: 'text-embedding-3-small',
              input: experience.trim(),
            });
            embedding = embeddingResponse.data[0].embedding;
          } catch (embeddingError) {
            console.error(`Error generating embedding for ${email}:`, embeddingError);
            // Don't skip, just proceed without embedding
            console.log(`Proceeding without embedding for ${name}`);
          }
        } else {
          console.log(`No tutoring experience provided for ${name}, skipping embedding.`);
        }

        // Create or update mentor record
        const mentorData: MentorUpsertData = {
          id: userId,
          bio: experience || null,
          embedding: embedding ? `[${embedding.join(',')}]` : undefined,
          status: 'pending_approval',
          responses: {
            university: university || null,
            course: course || null,
            experience: experience || null,
          },
          phone: phone || null,
        };

        const { error: mentorError } = await supabase
          .from('mentors')
          .upsert(mentorData);

        if (mentorError) {
          console.error(`Error creating mentor record for ${email}:`, mentorError);
          errorCount++;
          continue;
        }

        successCount++;
        console.log(`Successfully imported mentor: ${name}`);

      } catch (error) {
        console.error(`Unexpected error processing mentor ${mentor['What is your Full Name?']}:`, error);
        errorCount++;
      }
    }

    console.log(`\nImport completed:`);
    console.log(`- Successfully imported: ${successCount} mentors`);
    console.log(`- Errors: ${errorCount} mentors`);

  } catch (error) {
    console.error('Error importing mentors:', error);
  }
}

// Run the import
// Get CSV file path from command line arguments
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.error('Usage: ts-node import-mentors.ts <csv-file-path>');
  console.error('Example: ts-node import-mentors.ts mentors-temp-db.csv');
  console.error('Or with absolute path: ts-node import-mentors.ts /path/to/mentors.csv');
  process.exit(1);
}

importMentors(csvFilePath).catch(console.error);
