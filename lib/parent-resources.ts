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
    /** A numbered stage heading (gold circle), as in the application guide. */
    | { type: 'stage'; n: number; title: string }
    /** "The journey at a glance": a numbered overview of the stages. */
    | { type: 'glance'; label: string; intro: string; items: string[] }
    /** A tick-list of milestones (decorative boxes). */
    | { type: 'checklist'; label: string; title: string; intro: string; items: string[] }

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

const applicationProcess: ParentGuide = {
    slug: 'oxbridge-application-process',
    eyebrow: 'A guide for parents',
    title: 'A Breakdown of the Oxbridge Application Process',
    subtitle: 'A stage-by-stage guide to the Oxbridge application process and what to expect for your child',
    summary: 'The nine stages of an Oxbridge application, and how you can help at each one.',
    blocks: [
        {
            type: 'lead',
            text: 'If your child is thinking about applying to Oxford or Cambridge, you may be wondering what the process actually involves. From the outside, it can look complicated, with its own vocabulary, extra stages and an earlier deadline than other universities. That’s especially true if you didn’t go through it yourself.',
        },
        {
            type: 'p',
            text: 'The good news is that the process follows a clear order, and once you understand each step, it becomes far less daunting. This guide walks you through every stage, explains what your child will be doing and what to expect, and suggests practical ways you can support them along the way.',
        },
        {
            type: 'glance',
            label: 'The journey at a glance',
            intro: 'Your child’s application moves through nine stages, in this order:',
            items: [
                'Exploring and choosing',
                'The personal statement',
                'Submitting the application',
                'Admissions tests',
                'Extra forms and written work',
                'Shortlisting',
                'Interviews',
                'Decisions',
                'Meeting the offer',
            ],
        },

        { type: 'section', label: 'Section one', title: 'The basics to know first' },
        {
            type: 'term',
            term: 'Oxford or Cambridge, not both',
            text: 'In any one year, students can apply to Oxford or Cambridge, but not both. There are very rare exceptions, but they apply to only a handful of applicants. That means one of the first big decisions is which university best suits your child and the course they want to study.',
        },
        {
            type: 'term',
            term: 'The course comes first',
            text: 'Students apply for a specific subject from the start, rather than choosing a focus later on. The course shapes what they will study for their whole degree, as well as which tests, written work and interviews are involved. Courses with similar names can differ quite a lot between the two universities, so it’s worth reading each course page carefully.',
        },
        {
            type: 'term',
            term: 'The college system',
            text: 'Both universities are made up of colleges: communities where students live, eat, socialise and receive much of their teaching. Applicants can choose a college or make an open application, where a college is allocated for them. Many families worry about picking the “right” college, but both universities have systems in place so that strong applicants are considered fairly wherever they apply. It’s best to think of the choice as where your child would feel at home, rather than as a tactical decision.',
        },
        {
            type: 'term',
            term: 'How it fits with UCAS',
            text: 'Applications are made through UCAS, the same system used for other UK universities, and Oxford or Cambridge counts as one of your child’s five choices. The key difference is that the Oxbridge deadline is much earlier than the usual UCAS deadline, so the whole application, including the personal statement, needs to be ready sooner.',
        },

        { type: 'section', label: 'Section two', title: 'Stage by stage' },
        { type: 'p', text: 'Each stage below explains what happens and is followed by practical ways you can help.' },

        { type: 'stage', n: 1, title: 'Exploring and choosing' },
        {
            type: 'p',
            text: 'Before applying, your child will research courses, read course pages and suggested reading lists, and attend open days, either in person or online. This is also the time to explore their subject beyond the school syllabus through books, articles, lectures, podcasts and online courses.',
        },
        {
            type: 'p',
            text: 'Both universities, and many of their colleges, run access programmes, taster days and summer schools. Some are designed especially for students from backgrounds that are under-represented at Oxford and Cambridge.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Go to open days together if you can. Seeing the colleges in person often makes the idea feel much more real.',
                'Show interest in what they’re reading or watching, and ask them to explain it to you.',
                'Let your child lead on the choice of subject. Genuine interest will carry them through the rest of the process.',
            ],
        },

        { type: 'stage', n: 2, title: 'The personal statement' },
        {
            type: 'p',
            text: 'The personal statement is your child’s chance to explain why they want to study their chosen subject. Oxford and Cambridge tutors mainly look for genuine academic interest, evidence that the student has explored the subject beyond the classroom, and thoughtful reflection on what they have read or done. Extracurricular activities matter less, unless they connect to the subject.',
        },
        {
            type: 'p',
            text: 'The same statement goes to all five of your child’s university choices, so it needs to work for each of them. UCAS has recently changed the format of the statement, so your child’s school will be able to advise on the current requirements.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Be a sounding board. Ask what excites them about the subject and what they’ve enjoyed exploring.',
                'Read a draft if they invite you to, but resist the urge to rewrite it. Tutors want to hear your child’s own voice.',
                'Give them time and quiet space to draft, redraft and get feedback from teachers.',
            ],
        },

        { type: 'stage', n: 3, title: 'Submitting the application' },
        {
            type: 'p',
            text: 'The full UCAS application includes the personal statement, your child’s qualifications so far, their predicted grades and a reference written by their school. Applications are usually submitted through the school, and many schools set their own internal deadline well before the official one so that they have time to complete references.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Find out your school’s internal deadline early. It’s often the one that really matters.',
                'Offer to double-check details such as the course, the college choice and personal information before it’s sent.',
                'Help keep the atmosphere calm around submission. A last-minute rush adds unnecessary stress.',
            ],
        },

        { type: 'stage', n: 4, title: 'Admissions tests' },
        {
            type: 'p',
            text: 'Most Oxford and Cambridge courses require applicants to take an admissions test, though some don’t. The tests are designed to show how students think and how they apply what they know to unfamiliar problems, rather than how much they have memorised.',
        },
        {
            type: 'p',
            text: 'Registering for a test is often a separate step from the UCAS application, with its own deadline, so it’s important to check early. The official course page for your child’s subject will say whether a test is needed and which one.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Make sure your child has registered for any test they need, and on time.',
                'Help them find the official practice materials and past papers.',
                'Encourage steady, regular practice over the weeks beforehand rather than last-minute cramming.',
                'Reassure them that the test is only one part of the overall picture.',
            ],
        },

        { type: 'stage', n: 5, title: 'Extra forms and written work' },
        {
            type: 'p',
            text: 'Some courses ask applicants to send examples of written work from school, or to complete an extra form or answer additional questions after applying. Cambridge, for example, usually asks applicants to fill in a short additional online form. Requirements vary by course and university, so it’s worth checking the details carefully.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Note any extra requirements as soon as your child chooses their course, so nothing is missed.',
                'Help them read the instructions closely, including word limits and how to submit.',
                'Encourage them to choose written work they’re proud of and would be happy to discuss at interview.',
            ],
        },

        { type: 'stage', n: 6, title: 'Shortlisting' },
        {
            type: 'p',
            text: 'Shortlisting is how the universities decide who will be invited to interview. Both receive far more applications from strong students than they can interview or admit, so tutors carefully review each application and select a shortlist.',
        },
        { type: 'h3', text: 'What tutors look at' },
        {
            type: 'p',
            text: 'Tutors consider the whole application together: GCSE results, predicted A-level grades (or equivalent), admissions test scores where a test is required, the personal statement, the school reference and any written work. No single part decides the outcome on its own.',
        },
        {
            type: 'p',
            text: 'The two universities approach this stage a little differently. Cambridge interviews a large majority of its applicants, while Oxford shortlists more selectively, and admissions test results often play a bigger part in who is invited. The exact proportions vary by course and from year to year.',
        },
        { type: 'h3', text: 'Contextual information' },
        {
            type: 'p',
            text: 'Both universities also consider each student’s achievements in light of the opportunities they’ve had, such as how their school performs overall and measures of disadvantage in the area where they live. Much of this information comes automatically from the UCAS application, so families usually don’t need to do anything extra.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'If something significant has affected your child’s education, make sure their school knows, so it can be reflected in the reference or the right form.',
                'Remind your child that tutors look at the whole application, not just one score.',
                'Start preparing for interviews early, so your child feels ready if they are invited.',
            ],
        },

        { type: 'stage', n: 7, title: 'Interviews' },
        {
            type: 'p',
            text: 'Shortlisted applicants are invited to interview. Oxbridge interviews are academic conversations with tutors, much like a short version of the small-group teaching students receive at the university. Your child might be asked to discuss a passage, solve a problem, interpret an image or data, or talk about something from their personal statement. Interviews have often taken place online in recent years.',
        },
        {
            type: 'p',
            text: 'Tutors are interested in how your child thinks: how they respond to new ideas, work through problems and engage with suggestions. Interviews are not designed to trick anyone, and it’s perfectly fine not to know an answer straight away. Thinking aloud is exactly what tutors want to see. Some applicants have more than one interview, occasionally with a second college.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Practise talking about the subject at home. Ask your child to explain something they’ve read, and ask follow-up questions.',
                'If the interview is online, set up a quiet space and test the technology and internet connection in advance.',
                'Focus on reassurance and rest in the days beforehand. Feeling calm matters more than extra cramming.',
                'Afterwards, avoid a detailed post-mortem. Students often misjudge how an interview went.',
            ],
        },

        { type: 'stage', n: 8, title: 'Decisions' },
        {
            type: 'p',
            text: 'After interviews, the universities make their decisions. Your child will either receive an offer, which is usually conditional on their final exam results, or be told that their application has been unsuccessful.',
        },
        {
            type: 'p',
            text: 'Both universities have ways of making sure strong applicants don’t miss out just because their chosen college was particularly oversubscribed. At Cambridge, this is known as the pool, where other colleges can consider strong applicants and sometimes make them offers. At Oxford, applicants can be considered by colleges other than the one they applied to. An offer from a college your child didn’t choose is completely normal and just as good as any other offer.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Plan ahead for decision day so you’re ready to support your child whatever the outcome.',
                'Celebrate the effort they’ve put in, whatever the result.',
            ],
        },

        { type: 'stage', n: 9, title: 'Meeting the offer' },
        {
            type: 'p',
            text: 'Most offers are conditional on your child achieving particular grades in their final exams, sometimes in specific subjects. Offers are typically high, so the rest of Year 13 really matters. Students who already have their results may receive an unconditional offer.',
        },
        {
            type: 'p',
            text: 'Your child will also choose a firm choice and an insurance choice from their offers. If their grades fall slightly short, a place is not guaranteed, but it’s always worth contacting the college on results day, as decisions are made case by case.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Help your child balance revision with rest. Steady work through Years 12 and 13 is what secures the place.',
                'Encourage them to choose a sensible insurance option they would be happy to attend.',
                'Be available on results day.',
            ],
        },

        {
            type: 'checklist',
            label: 'Keeping track',
            title: 'Your milestones checklist',
            intro: 'Use this checklist to keep track of your child’s progress through each step.',
            items: [
                'Researched courses and attended open days',
                'Chosen a course and a university',
                'Chosen a college or decided on an open application',
                'Found out the school’s internal deadline',
                'Finalised the personal statement',
                'Registered for an admissions test (if needed)',
                'Submitted the UCAS application',
                'Completed any extra forms or written work',
                'Taken the admissions test (if needed)',
                'Prepared for interview',
                'Received a decision',
                'Chosen firm and insurance options',
                'Place confirmed on results day',
            ],
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

const supportingTopGrades: ParentGuide = {
    slug: 'supporting-top-grades',
    eyebrow: 'A guide for parents',
    title: 'Supporting Top Grades',
    subtitle: 'How to help with revision and exams without adding pressure',
    summary: 'What effective revision looks like, and how to help at home without adding pressure.',
    blocks: [
        {
            type: 'lead',
            text: 'Exam periods can be stressful for the whole family. Most parents want to help, but it isn’t always clear how, and well-meant support can sometimes feel like pressure to a teenager in the middle of revision.',
        },
        {
            type: 'p',
            text: 'This guide explains why grades matter for Oxbridge, what effective revision actually looks like, and the practical ways you can support your child at home, from the first revision timetable to the last exam.',
        },

        { type: 'section', label: 'Section one', title: 'Why grades matter for Oxbridge' },
        {
            type: 'p',
            text: 'Grades play a part at several stages of an Oxbridge application, which is why steady work throughout secondary school makes such a difference.',
        },
        {
            type: 'term',
            term: 'GCSE results',
            text: 'GCSEs are usually the most recent completed exams on an application, so tutors look at them carefully, alongside information about the student’s school and circumstances.',
        },
        {
            type: 'term',
            term: 'Predicted grades',
            text: 'Teachers’ predictions for final exams are a key part of the UCAS application. They’re based on your child’s work and progress over time, so consistent effort in Year 12 really counts.',
        },
        {
            type: 'term',
            term: 'Meeting the offer',
            text: 'Most Oxbridge offers are conditional on final exam results, and they’re typically high, often including top grades. Securing a place depends on performing well when it matters most.',
        },

        { type: 'section', label: 'Section two', title: 'What effective revision looks like' },
        {
            type: 'p',
            text: 'Research into how people learn points clearly to a handful of techniques that work far better than others. None of them is complicated, and once your child gets used to them, they often save time.',
        },
        {
            type: 'term',
            term: 'Testing yourself',
            text: 'Trying to recall information from memory, through practice questions, flashcards or writing down everything you know about a topic, is one of the most effective ways to learn. The effort of remembering is what makes knowledge stick.',
        },
        {
            type: 'term',
            term: 'Spreading revision out',
            text: 'Coming back to a topic several times over weeks works much better than covering it once in a long session. Short, regular revision beats last-minute cramming.',
        },
        {
            type: 'term',
            term: 'Mixing topics',
            text: 'Switching between different topics or types of question within a session helps students learn to recognise which approach a question needs, just as they will in the exam.',
        },
        {
            type: 'term',
            term: 'Practising past papers',
            text: 'Working through past papers under timed conditions, then checking answers carefully against the mark scheme, shows students exactly what examiners are looking for.',
        },
        {
            type: 'term',
            term: 'Explaining ideas aloud',
            text: 'Explaining a topic to someone else, or even to themselves, quickly shows a student what they understand and where the gaps are.',
        },
        {
            type: 'callout',
            label: 'Worth knowing',
            text: 'Some of the most popular revision habits, such as rereading notes, highlighting and copying out notes neatly, feel productive but do little to help students remember. If your child spends hours on these, gently encourage them to swap some of that time for self-testing.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Offer to test your child with flashcards or questions, if they’d like you to.',
                'Ask them to explain a topic to you. You don’t need to understand it fully to be a useful listener.',
                'Encourage them to start revising early, so there’s time to return to each topic more than once.',
            ],
        },

        { type: 'section', label: 'Section three', title: 'Setting up for success at home' },
        {
            type: 'term',
            term: 'A good place to study',
            text: 'A quiet, tidy space with good light and everything your child needs close at hand makes it easier to settle down and focus. It doesn’t need to be large, just consistent.',
        },
        {
            type: 'term',
            term: 'Routines',
            text: 'Revising at similar times each day turns studying into a habit rather than a daily decision, which makes getting started much easier.',
        },
        {
            type: 'term',
            term: 'Phones and distractions',
            text: 'Even a phone sitting face down on a desk can pull attention away. Keeping it in another room during revision sessions is one of the simplest changes a student can make.',
        },
        {
            type: 'term',
            term: 'A realistic timetable',
            text: 'A revision timetable should cover every subject, build in regular reviews of earlier topics and leave room for rest. A plan your child can actually stick to is better than an ambitious one they abandon.',
        },
        {
            type: 'term',
            term: 'Regular breaks',
            text: 'Concentration fades after a while, so short breaks between focused sessions help students stay productive for longer.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Help your child create a study space that works for them, and protect it from interruptions.',
                'Suggest a family agreement on phones during revision time. It helps if adults join in too.',
                'Offer to help draw up a revision timetable, but let your child take ownership of it.',
            ],
        },

        { type: 'section', label: 'Section four', title: 'Looking after the basics' },
        {
            type: 'p',
            text: 'Sleep, food, exercise and rest aren’t extras to fit in around revision. They have a direct effect on memory, concentration and mood, and they matter even more during busy periods.',
        },
        {
            type: 'term',
            term: 'Sleep',
            text: 'Sleep is when the brain consolidates what it has learned. Late-night cramming usually costs more than it gains, and a regular bedtime makes a real difference.',
        },
        {
            type: 'term',
            term: 'Food and water',
            text: 'Regular meals and staying hydrated keep energy and concentration steady throughout the day.',
        },
        {
            type: 'term',
            term: 'Exercise and fresh air',
            text: 'Even a short walk can lift mood, ease stress and help students return to their work refreshed.',
        },
        {
            type: 'term',
            term: 'Downtime',
            text: 'Time with friends, hobbies and simply relaxing helps students stay balanced and motivated over a long revision period.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Keep family mealtimes regular, and have healthy snacks available during revision.',
                'Encourage a consistent bedtime, especially in the weeks before exams.',
                'Suggest a walk or some time outside together as a break from studying.',
            ],
        },

        { type: 'section', label: 'Section five', title: 'Helping without nagging' },
        {
            type: 'term',
            term: 'Offer, don’t impose',
            text: 'Ask your child what kind of help they would find useful, and respect their answer. Support they’ve chosen is far more effective than support they feel pushed into.',
        },
        {
            type: 'term',
            term: 'Check in, lightly',
            text: 'A brief, relaxed conversation about how revision is going works better than frequent questions about how much they’ve done.',
        },
        {
            type: 'term',
            term: 'Praise effort',
            text: 'Recognising hard work, good habits and progress builds motivation more reliably than focusing on grades alone.',
        },
        {
            type: 'term',
            term: 'Watch for signs of stress',
            text: 'Changes in sleep, appetite or mood, withdrawing from friends and family, or constant worry can all be signs that stress is building. If you’re concerned, talk to your child and, if needed, their school.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Ask “How can I help?” rather than “Have you done your revision?”',
                'Notice and mention the effort your child is putting in.',
                'Keep the atmosphere at home calm, and remind your child that you’re proud of them whatever happens.',
            ],
        },

        { type: 'section', label: 'Section six', title: 'Exam season' },
        {
            type: 'term',
            term: 'The night before',
            text: 'A light review of key points is fine, but this isn’t the time for new material. Packing everything needed for the exam and getting a good night’s sleep matter more than last-minute cramming.',
        },
        {
            type: 'term',
            term: 'The morning of the exam',
            text: 'A proper breakfast, leaving in good time and a calm start to the day help your child arrive focused and ready.',
        },
        {
            type: 'term',
            term: 'After each exam',
            text: 'It’s natural to want to know how it went, but detailed post-mortems often increase anxiety, and students frequently misjudge their own performance. It’s usually best to acknowledge the exam, take a short break and move on to preparing for the next one.',
        },
        {
            type: 'list',
            label: 'How you can help',
            items: [
                'Help your child check the exam timetable and pack what they need the night before.',
                'Make the morning as calm and unhurried as possible.',
                'After each exam, ask how they’re feeling rather than going through the questions.',
                'Plan something enjoyable for when the exams are over.',
            ],
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

export const PARENT_GUIDES: ParentGuide[] = [oxbridgeDictionary, applicationProcess, supportingTopGrades, whereADegreeCanLead]

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
                case 'stage':
                    return b.title
                case 'glance':
                    return [b.intro, ...b.items].join(' ')
                case 'checklist':
                    return [b.title, b.intro, ...b.items].join(' ')
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
