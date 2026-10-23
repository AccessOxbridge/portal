/*
 * Resources for parents: the guides shown on /dashboard/parent/resources.
 *
 * Each guide is the content of a PDF from the Access Oxbridge team, rebuilt as
 * blocks so it reads as a portal page (and reflows on a phone) instead of a
 * download. The wording is the PDF's. To add a guide, add an entry to
 * PARENT_GUIDES; to tease one that isn't available yet, add it to
 * LOCKED_RESOURCES (title and one line only, no content).
 *
 * Server-only data: the pages that render it check the caller is a parent.
 */

export type GuideBlock =
    | { type: 'lead'; text: string }
    | { type: 'p'; text: string }
    | { type: 'section'; label: string; title: string }
    | { type: 'h3'; text: string }
    | { type: 'term'; term: string; tag?: 'Oxford' | 'Cambridge'; text: string }
    | { type: 'table'; label: string; intro: string; columns: string[]; rows: string[][] }
    | { type: 'stats'; label: string; items: { value: string; text: string }[] }
    | { type: 'callout'; label: string; text: string }
    | { type: 'list'; label: string; items: string[] }
    | { type: 'links'; title: string; intro: string; items: { label: string; href: string; text: string }[] }

export interface ParentGuide {
    slug: string
    eyebrow: string
    title: string
    subtitle: string
    /** One line for the card on the Resources page. */
    summary: string
    blocks: GuideBlock[]
}

export interface LockedResource {
    title: string
    summary: string
}

const OXFORD = 'https://www.ox.ac.uk/admissions/undergraduate'
const CAMBRIDGE = 'https://www.undergraduate.study.cam.ac.uk'
const UCAS = 'https://www.ucas.com'
const DISCOVER_UNI = 'https://discoveruni.gov.uk'

const oxbridgeDictionary: ParentGuide = {
    slug: 'oxbridge-dictionary',
    eyebrow: 'A guide for parents',
    title: 'The Oxbridge Dictionary',
    subtitle: 'A plain-English guide to the words and phrases you’ll hear along the way',
    summary: 'Supervision, Michaelmas, Tripos: the words you’ll hear, explained in plain English.',
    blocks: [
        {
            type: 'lead',
            text: 'Oxford and Cambridge have a vocabulary all of their own. Words like “supervision”, “Michaelmas” and “Tripos” come up in conversations, on websites and in letters, and it’s easy to feel left out if you didn’t go through the process yourself.',
        },
        {
            type: 'p',
            text: 'This dictionary explains the terms you’re most likely to hear, in plain English. It’s grouped by theme so you can find words as you come across them. Where a term is used at only one of the two universities, it’s labelled Oxford or Cambridge.',
        },
        {
            type: 'table',
            label: 'Same idea, different name',
            intro: 'Some of the most confusing terms are simply different names for the same thing at each university:',
            columns: ['What it means', 'Oxford', 'Cambridge'],
            rows: [
                ['Small-group teaching with a tutor', 'Tutorial', 'Supervision'],
                ['The autumn term', 'Michaelmas', 'Michaelmas'],
                ['The spring term', 'Hilary', 'Lent'],
                ['The summer term', 'Trinity', 'Easter'],
                ['Strong applicants considered by other colleges', 'Reallocation', 'The pool'],
                ['The main university exams', 'Prelims (or Mods) and Finals', 'Tripos exams, in Parts'],
            ],
        },

        { type: 'section', label: 'Section one', title: 'Applying' },
        {
            type: 'term',
            term: 'Super-curricular',
            text: 'Activities that take a student’s interest in their subject beyond the school syllabus, such as wider reading, lectures, online courses and competitions. Tutors value these more than general extracurricular activities.',
        },
        {
            type: 'term',
            term: 'UCAS',
            text: 'The Universities and Colleges Admissions Service, the central system students use to apply to UK universities, including Oxford and Cambridge.',
        },
        {
            type: 'term',
            term: 'Open application',
            text: 'Applying without choosing a particular college. A college is then allocated to the student, and open applicants are considered in exactly the same way as everyone else.',
        },
        {
            type: 'term',
            term: 'Deferred entry',
            text: 'Applying for a place that starts a year later than usual, often to take a gap year. Not every course accepts deferred applications, so it’s worth checking the course page.',
        },
        {
            type: 'term',
            term: 'Personal statement',
            text: 'A piece of writing, submitted through UCAS, in which the student explains why they want to study their chosen subject. The same statement goes to all their university choices.',
        },
        {
            type: 'term',
            term: 'Predicted grades',
            text: 'The grades a student’s teachers expect them to achieve in their final exams. They’re included in the UCAS application and play an important part in shortlisting.',
        },
        {
            type: 'term',
            term: 'School reference',
            text: 'A statement written by the student’s school, usually by a teacher or tutor, describing their academic ability and potential. It forms part of the UCAS application.',
        },
        {
            type: 'term',
            term: 'Admissions test',
            text: 'A written test that many courses ask applicants to take as part of their application. It’s designed to show how a student thinks and applies what they know, rather than how much they’ve memorised. Most courses require one; some don’t.',
        },
        {
            type: 'term',
            term: 'Shortlisting',
            text: 'The stage at which tutors review applications and decide who to invite to interview.',
        },
        {
            type: 'term',
            term: 'Reallocation',
            tag: 'Oxford',
            text: 'Oxford’s way of spreading applicants across colleges so that strong candidates are considered fairly. A student may be interviewed by, or receive an offer from, a college they didn’t originally apply to.',
        },
        {
            type: 'term',
            term: 'Interview',
            text: 'An academic conversation between a shortlisted applicant and tutors, usually focused on the student’s chosen subject. Tutors are interested in how the student thinks, not just what they already know.',
        },
        {
            type: 'term',
            term: 'The pool',
            tag: 'Cambridge',
            text: 'Cambridge’s system for making sure strong applicants don’t miss out if their college can’t offer them a place. Other colleges can consider pooled applicants and sometimes make them offers.',
        },
        {
            type: 'term',
            term: 'Conditional offer',
            text: 'An offer of a place that depends on the student achieving particular grades in their final exams. Most Oxbridge offers are conditional.',
        },
        {
            type: 'term',
            term: 'Contextual information',
            text: 'Information about a student’s school and background that helps tutors understand their achievements in light of the opportunities they’ve had.',
        },
        {
            type: 'callout',
            label: 'Worth knowing',
            text: 'An offer from a college your child didn’t apply to, whether through the pool at Cambridge or reallocation at Oxford, is completely normal and just as good as any other offer.',
        },

        { type: 'section', label: 'Section two', title: 'How the universities are organised' },
        {
            type: 'term',
            term: 'Collegiate university',
            text: 'A university made up of a central university and a number of individual colleges. The central university sets the courses, runs the exams and awards degrees, while the colleges admit students and provide their accommodation, welfare support and much of their teaching.',
        },
        {
            type: 'term',
            term: 'College',
            text: 'A self-contained community within the university where students live, eat, socialise and receive much of their teaching. Every student belongs to a college as well as to the university.',
        },
        {
            type: 'term',
            term: 'Department and faculty',
            text: 'The central university bodies responsible for each subject. They organise lectures, seminars and laboratory work, and set the exams.',
        },
        {
            type: 'term',
            term: 'Director of Studies',
            tag: 'Cambridge',
            text: 'An academic in the student’s college who oversees their studies, arranges their supervisions and keeps an eye on their progress.',
        },
        {
            type: 'term',
            term: 'Head of House',
            text: 'The head of a college. The title varies from college to college and can include Master, Principal, Warden, Provost and President.',
        },
        {
            type: 'term',
            term: 'JCR and MCR',
            text: 'The Junior Common Room (JCR) is the community of undergraduate students in a college, along with its elected committee and common room. The Middle Common Room (MCR) is the equivalent for graduate students.',
        },
        {
            type: 'term',
            term: 'Porters and the Porters’ Lodge',
            text: 'The porters work at the college entrance, known as the Lodge. They handle post, security and keys, and are often the first people students turn to for help.',
        },
        {
            type: 'term',
            term: 'Senior Tutor',
            text: 'A senior member of a college who is responsible for academic matters, such as students’ progress and studies.',
        },
        {
            type: 'callout',
            label: 'Worth knowing',
            text: 'Every college has its own character, traditions and facilities, but all students on the same course study the same syllabus and sit the same university exams, whichever college they belong to.',
        },

        { type: 'section', label: 'Section three', title: 'Teaching and studying' },
        {
            type: 'term',
            term: 'Tutorial',
            tag: 'Oxford',
            text: 'Oxford’s small-group teaching sessions, usually with one tutor and between one and three students. Students prepare work beforehand, such as an essay or problem sheet, and then discuss it in depth.',
        },
        {
            type: 'term',
            term: 'Supervision',
            tag: 'Cambridge',
            text: 'Cambridge’s equivalent of the tutorial: small-group sessions in which students discuss work they’ve prepared with an expert in the subject.',
        },
        {
            type: 'term',
            term: 'Lecture',
            text: 'A talk given by an academic to a larger group of students, usually organised by the department.',
        },
        {
            type: 'term',
            term: 'Seminar and practical',
            text: 'A seminar is a discussion-based class for a group of students. A practical is a hands-on laboratory session, mainly in science subjects.',
        },
        {
            type: 'term',
            term: 'Reading list',
            text: 'A list of books and articles that tutors recommend for a course or topic. Students often receive one before they arrive.',
        },
        {
            type: 'term',
            term: 'Collections',
            tag: 'Oxford',
            text: 'Practice exams set by a student’s college, usually at the start of term, to check progress. They don’t count towards the final degree.',
        },
        {
            type: 'term',
            term: 'Prelims, Mods and Finals',
            tag: 'Oxford',
            text: 'Oxford’s university exams. First-year exams are usually called Prelims, or Mods on some courses. Finals, taken at the end of the degree, determine the final result.',
        },
        {
            type: 'term',
            term: 'Tripos',
            tag: 'Cambridge',
            text: 'The name for Cambridge’s undergraduate courses and their exams. Each course is divided into Parts, such as Part IA, Part IB and Part II, with exams at each stage.',
        },
        {
            type: 'callout',
            label: 'Worth knowing',
            text: 'Tutorials and supervisions are at the heart of Oxbridge teaching. Being taught in such small groups is one of the things that makes studying at Oxford or Cambridge distinctive.',
        },

        { type: 'section', label: 'Section four', title: 'Terms and the academic year' },
        {
            type: 'term',
            term: 'Michaelmas, Hilary and Trinity',
            tag: 'Oxford',
            text: 'The names of Oxford’s three terms: autumn, spring and summer.',
        },
        {
            type: 'term',
            term: 'Michaelmas, Lent and Easter',
            tag: 'Cambridge',
            text: 'The names of Cambridge’s three terms: autumn, spring and summer.',
        },
        { type: 'term', term: 'Full term', text: 'The main eight-week teaching period of each term.' },
        {
            type: 'term',
            term: 'Numbered weeks',
            text: 'The weeks of term are often referred to by number, for example “fifth week”. The week before term begins is sometimes called “Week 0”.',
        },
        {
            type: 'term',
            term: 'Vacation',
            text: 'The breaks between terms. Students are usually expected to keep up with reading and work during the vacations.',
        },
        {
            type: 'callout',
            label: 'Worth knowing',
            text: 'Oxbridge terms are shorter than at most universities, so the workload during term is intense. Many students say the pace takes some getting used to, but the longer vacations help balance it out.',
        },

        {
            type: 'links',
            title: 'Where to find official information',
            intro: 'Details such as admissions tests, deadlines and course requirements can change from year to year. Always check the latest information on the official websites:',
            items: [
                { label: 'University of Oxford undergraduate admissions', href: OXFORD, text: 'ox.ac.uk/admissions/undergraduate' },
                { label: 'University of Cambridge undergraduate study', href: CAMBRIDGE, text: 'undergraduate.study.cam.ac.uk' },
                { label: 'UCAS', href: UCAS, text: 'ucas.com' },
            ],
        },
    ],
}

const whereADegreeCanLead: ParentGuide = {
    slug: 'where-an-oxbridge-degree-can-lead',
    eyebrow: 'A guide for parents',
    title: 'Where an Oxbridge Degree Can Lead',
    subtitle: 'What an Oxbridge degree can mean for your child’s future',
    summary: 'The skills, careers and support that come with an Oxford or Cambridge degree.',
    blocks: [
        {
            type: 'lead',
            text: 'When your child is thinking about Oxford or Cambridge, it’s natural to look beyond the application and ask what happens afterwards. Where could an Oxbridge degree take them, and what difference does it really make?',
        },
        {
            type: 'p',
            text: 'This guide looks at what makes the degree distinctive, the paths graduates go on to follow, what the data says about graduate earnings, and the support students receive along the way. It also keeps things in perspective, because an Oxbridge degree opens doors, but what your child does with it matters most.',
        },
        {
            type: 'stats',
            label: 'Oxbridge in numbers',
            items: [
                { value: '46', text: 'British prime ministers studied at Oxford or Cambridge' },
                { value: '150+', text: 'Nobel Prize winners have been associated with the two universities' },
                { value: 'Top tier', text: 'Consistently among the highest graduate earnings of any UK university' },
            ],
        },

        { type: 'section', label: 'Section one', title: 'What makes the degree distinctive' },
        {
            type: 'p',
            text: 'The way Oxford and Cambridge teach is at the heart of what makes their graduates stand out. Week after week, students prepare work and discuss it in small groups with experts in their subject, through tutorials at Oxford and supervisions at Cambridge. Over three or four years, this builds a set of skills that employers and universities around the world value highly.',
        },
        {
            type: 'term',
            term: 'Thinking independently',
            text: 'Students learn to tackle unfamiliar problems, weigh up evidence and reach their own conclusions, rather than simply learning what they’re told.',
        },
        {
            type: 'term',
            term: 'Communicating clearly',
            text: 'Regular essays, problem sheets and discussions train students to write precisely and explain complex ideas in a way others can follow.',
        },
        {
            type: 'term',
            term: 'Defending an argument',
            text: 'Having their work questioned closely by tutors teaches students to think on their feet, respond to challenge and change their minds when the evidence demands it.',
        },
        {
            type: 'term',
            term: 'Managing a demanding workload',
            text: 'Short, intense terms mean students learn to plan their time, meet frequent deadlines and work under pressure, skills that carry straight into professional life.',
        },

        { type: 'section', label: 'Section two', title: 'The paths graduates take' },
        {
            type: 'p',
            text: 'Oxbridge graduates go on to an enormous range of careers. Here are some of the most common paths, along with a few of the well-known people who studied at Oxford or Cambridge.',
        },
        {
            type: 'term',
            term: 'Further study and research',
            text: 'Many graduates continue to a master’s degree or doctorate, at Oxbridge or at other leading universities around the world. The two universities have produced some of history’s most influential thinkers and scientists, including Isaac Newton, Charles Darwin, Alan Turing and Rosalind Franklin at Cambridge, and Stephen Hawking, who studied at Oxford before completing his doctorate at Cambridge.',
        },
        {
            type: 'term',
            term: 'Government, public service and public life',
            text: 'Oxford and Cambridge have educated 46 British prime ministers between them, along with leaders of countries around the world, including Jawaharlal Nehru and Manmohan Singh of India (Cambridge) and Indira Gandhi of India and Benazir Bhutto of Pakistan (Oxford). Many graduates join the Civil Service, international organisations and charities, and the campaigner and Nobel Peace Prize winner Malala Yousafzai studied at Oxford.',
        },
        {
            type: 'term',
            term: 'Law',
            text: 'Law is a popular destination for Oxbridge graduates, and not only those who study it. Graduates of any subject can train as solicitors or barristers through conversion routes, and many of the UK’s most senior judges studied at Oxford or Cambridge.',
        },
        {
            type: 'term',
            term: 'Medicine and healthcare',
            text: 'Medical students at Oxford and Cambridge combine scientific training with clinical experience, and graduates go on to careers as doctors, surgeons and medical researchers. Graduates of other science subjects also move into healthcare, research and the life sciences.',
        },
        {
            type: 'term',
            term: 'Finance, consulting and business',
            text: 'Banks, consultancies and leading companies recruit heavily from Oxford and Cambridge, often taking graduates from any subject. Oxbridge alumni have founded and led major businesses, including LinkedIn co-founder Reid Hoffman, who studied at Oxford.',
        },
        {
            type: 'term',
            term: 'Technology and entrepreneurship',
            text: 'Cambridge in particular sits at the centre of one of Europe’s leading technology and science clusters, and both universities support students who want to start their own ventures. Sir Tim Berners-Lee, inventor of the World Wide Web, studied at Oxford, and Sir Demis Hassabis, co-founder of Google DeepMind and a Nobel Prize winner in Chemistry, studied at Cambridge.',
        },
        {
            type: 'term',
            term: 'Media, arts and culture',
            text: 'Oxbridge has a long tradition in writing, journalism, theatre and film. J.R.R. Tolkien studied and taught at Oxford, and the novelist Zadie Smith and the actor and screenwriter Emma Thompson studied at Cambridge. Student theatre, journalism and comedy societies have launched many famous careers.',
        },
        {
            type: 'term',
            term: 'Teaching and education',
            text: 'Many graduates choose to teach, in schools or universities, passing on their love of their subject to the next generation.',
        },
        {
            type: 'callout',
            label: 'Worth knowing',
            text: 'The subject your child studies rarely locks them into a single career. Many employers, from law firms to the Civil Service, recruit graduates from any discipline, so your child can choose the subject they love without worrying that it will limit their options later.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Talk with your child about what interests them, rather than focusing on prestige or particular job titles.',
                'Encourage them to choose the subject they enjoy most. Genuine interest is what helps students thrive.',
                'Share your own experience of work, and help them meet people in careers they’re curious about.',
            ],
        },

        { type: 'section', label: 'Section three', title: 'What the data says about earnings' },
        {
            type: 'p',
            text: 'The UK government publishes data on what graduates earn after university, using tax records to track earnings over time. This data consistently places Oxford and Cambridge among the highest-earning universities in the UK, with graduates’ typical earnings well above the national average for graduates several years after finishing their degree.',
        },
        {
            type: 'p',
            text: 'A separate national survey, Graduate Outcomes, asks graduates what they’re doing around fifteen months after finishing their course. The large majority of Oxbridge graduates are in work or further study by that point, many in highly skilled roles.',
        },
        { type: 'h3', text: 'Reading the figures sensibly' },
        {
            type: 'p',
            text: 'Earnings vary a great deal by subject and career. A graduate who becomes a teacher or works for a charity will usually earn less than one who joins an investment bank, whatever university they attended. Earnings data also reflects the students who go to each university, not just the university itself, so it’s best used as a broad picture rather than a promise.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Look up graduate outcomes for the specific courses your child is considering together, using the official Discover Uni website.',
                'Compare the same subject across several universities, rather than comparing different subjects with each other.',
                'Treat the figures as one consideration among many. The right course and the right fit matter more.',
            ],
        },

        { type: 'section', label: 'Section four', title: 'Support along the way' },
        {
            type: 'p',
            text: 'Both universities give students plenty of help in preparing for life after their degree, starting from their first year.',
        },
        {
            type: 'term',
            term: 'Careers services',
            text: 'Oxford and Cambridge each run a dedicated careers service offering one-to-one advice, help with applications and interviews, employer events and careers fairs.',
        },
        {
            type: 'term',
            term: 'Internships and work experience',
            text: 'Students can access internships, placements and work experience during the vacations, many of them advertised specifically to Oxbridge students.',
        },
        {
            type: 'term',
            term: 'College and alumni networks',
            text: 'Colleges keep in touch with former students, and alumni networks around the world can offer advice, mentoring and connections.',
        },
        {
            type: 'term',
            term: 'Societies and activities',
            text: 'From student newspapers and debating to business, technology and volunteering societies, extracurricular life gives students real experience and responsibility alongside their studies.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Encourage your child to visit the careers service early in their degree, not just in their final year.',
                'Suggest they get involved in a society or two that connects with their interests.',
                'Remind them that exploring different options is part of the process. Not knowing yet is completely normal.',
            ],
        },

        { type: 'section', label: 'Section five', title: 'Keeping perspective' },
        {
            type: 'p',
            text: 'An Oxbridge degree is a real advantage. It brings outstanding teaching, valuable skills, and a name that is recognised and respected around the world. But it isn’t a guarantee, and it isn’t the only route to a successful and fulfilling future.',
        },
        {
            type: 'p',
            text: 'What makes the biggest difference is what students do with their time at university: how fully they engage with their subject, the opportunities they take and the people they meet. Whatever path your child chooses, the curiosity and hard work that lead them to consider Oxford or Cambridge will serve them well.',
        },

        {
            type: 'links',
            title: 'Where to find official information',
            intro: 'Details such as admissions tests, deadlines and course requirements can change from year to year. Always check the latest information on the official websites:',
            items: [
                { label: 'University of Oxford undergraduate admissions', href: OXFORD, text: 'ox.ac.uk/admissions/undergraduate' },
                { label: 'University of Cambridge undergraduate study', href: CAMBRIDGE, text: 'undergraduate.study.cam.ac.uk' },
                { label: 'Discover Uni (official course and graduate outcomes data)', href: DISCOVER_UNI, text: 'discoveruni.gov.uk' },
                { label: 'UCAS', href: UCAS, text: 'ucas.com' },
            ],
        },
    ],
}

export const PARENT_GUIDES: ParentGuide[] = [oxbridgeDictionary, whereADegreeCanLead]

/** Guides for the child that aren't available to this family yet: shown blurred and locked. */
export const LOCKED_RESOURCES: LockedResource[] = [
    { title: 'Personal statement, step by step', summary: 'From a blank page to a final draft, with examples of what tutors look for.' },
    { title: 'Admissions tests explained', summary: 'Which courses set a test, what each one checks and how to prepare.' },
    { title: 'Inside an Oxbridge interview', summary: 'What really happens in the room, and how to practise thinking aloud.' },
    { title: 'Choosing a college', summary: 'How colleges differ, and when an open application makes sense.' },
    { title: 'Super-curricular reading by subject', summary: 'Books, lectures and competitions that build real interest in a subject.' },
]

export function getParentGuide(slug: string): ParentGuide | undefined {
    return PARENT_GUIDES.find((g) => g.slug === slug)
}

/** Rough reading time: about 200 words a minute. */
export function readingMinutes(guide: ParentGuide): number {
    const words = guide.blocks
        .map((b) => {
            switch (b.type) {
                case 'table':
                    return [b.intro, ...b.rows.flat()].join(' ')
                case 'stats':
                    return b.items.map((x) => x.text).join(' ')
                case 'list':
                    return b.items.join(' ')
                case 'links':
                    return b.intro
                case 'section':
                    return b.title
                case 'term':
                    return `${b.term} ${b.text}`
                default:
                    return b.text
            }
        })
        .join(' ')
        .split(/\s+/).length
    return Math.max(1, Math.round(words / 200))
}
