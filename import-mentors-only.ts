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
}

// Parse CSV data
function parseCSV(csvContent: string): MentorData[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

  const rows: MentorData[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
    const row: Partial<MentorData> = {};
    headers.forEach((header, index) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (row as any)[header] = values[index] || '';
    });
    rows.push(row as MentorData);
  }

  return rows;
}

async function importMentorRecords(): Promise<void> {
  try {
    // Read CSV file
    const csvPath = join(__dirname, 'mentors-temp-db.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');

    const mentors = parseCSV(csvContent);
    console.log(`Found ${mentors.length} mentor records to import`);

    let successCount = 0;
    let errorCount = 0;

    for (const mentor of mentors) {
      try {
        const name = mentor['What is your Full Name?'];
        const email = mentor['What is your Email?'];
        const experience = mentor['What tutoring/mentoring experience do you have?'];

        // Skip if missing essential data
        if (!name || !email) {
          console.log(`Skipping mentor with missing name or email: ${name || 'No name'} - ${email || 'No email'}`);
          errorCount++;
          continue;
        }

        console.log(`Processing mentor: ${name} (${email})`);

        // Find existing user by email
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
          console.error(`Error listing users: ${listError.message}`);
          errorCount++;
          continue;
        }

        const existingUser = users.users.find(u => u.email === email);
        if (!existingUser) {
          console.log(`User ${email} not found in auth, skipping...`);
          errorCount++;
          continue;
        }

        const userId = existingUser.id;
        console.log(`Found existing user with ID: ${userId}`);

        // Ensure profile exists and is set to mentor role
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

        // Generate embedding for mentor bio
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
            console.log(`Skipping mentor ${name} due to embedding failure`);
            errorCount++;
            continue;
          }
        } else {
          console.log(`Skipping mentor ${name} - no tutoring experience provided`);
          errorCount++;
          continue;
        }

        // Skip if embedding is null (shouldn't happen due to above logic, but safety check)
        if (!embedding) {
          console.log(`Skipping mentor ${name} - embedding generation failed`);
          errorCount++;
          continue;
        }

        // Create mentor record
        const mentorData: MentorUpsertData = {
          id: userId,
          bio: experience || null,
          embedding: `[${embedding.join(',')}]`
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
        console.log(`Successfully imported mentor record: ${name}`);

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
importMentorRecords().catch(console.error);
