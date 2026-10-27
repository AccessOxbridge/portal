import type { GuideBlock, ParentGuide } from '@/lib/parent-resources'

/*
 * The guides written for students, shown to parents under "<Child>'s
 * Resources". Locked (title and summary only) until the family is enrolled,
 * i.e. the parent is linked to their child's account; the guide page checks
 * the same thing on the server. The wording is the PDFs' (October 2026).
 */

const OXFORD = 'https://www.ox.ac.uk/admissions/undergraduate'
const CAMBRIDGE = 'https://www.undergraduate.study.cam.ac.uk'
const UCAS = 'https://www.ucas.com'

const DETAILS_CHANGE = 'Details such as admissions tests, deadlines and course requirements can change from year to year. '

function officialLinks(intro = `${DETAILS_CHANGE}Always check the latest information on the official websites:`): GuideBlock {
    return {
        type: 'links',
        title: 'Where to find official information',
        intro,
        items: [
            { label: 'University of Oxford undergraduate admissions', href: OXFORD, text: 'ox.ac.uk/admissions/undergraduate' },
            { label: 'University of Cambridge undergraduate study', href: CAMBRIDGE, text: 'undergraduate.study.cam.ac.uk' },
            { label: 'UCAS', href: UCAS, text: 'ucas.com' },
        ],
    }
}

const tryThis = (...items: string[]): GuideBlock => ({ type: 'list', label: 'Try this', items })
const term = (t: string, text: string): GuideBlock => ({ type: 'term', term: t, text })

const personalStatement: ParentGuide = {
    slug: 'personal-statement-step-by-step',
    eyebrow: 'A guide for students',
    title: 'Personal Statement Step by Step',
    subtitle: 'How to write a statement that shows tutors how you think',
    summary: 'From a blank page to a final draft, and what tutors look for along the way.',
    blocks: [
        {
            type: 'lead',
            text: 'Your personal statement is your chance to show admissions tutors what excites you about your subject, and how you think about it. It’s one of the few parts of your application written entirely in your own words.',
        },
        {
            type: 'p',
            text: 'A strong statement rarely comes from a sudden moment of inspiration. It comes from a clear process: gathering your material, finding what genuinely interests you, and drafting and redrafting until every sentence earns its place. This guide takes you through that process step by step.',
        },
        { type: 'section', label: 'Section one', title: 'What tutors are looking for' },
        term('Genuine academic interest', 'Tutors want to teach students who love their subject. Your statement should make it clear what draws you to it and which questions or ideas you find most compelling.'),
        term('Exploration beyond the syllabus', 'Tutors look for evidence that you’ve gone further than your school courses, through reading, lectures, projects, competitions or other independent work. This is often called super-curricular activity.'),
        term('Thoughtful reflection', 'What you did matters less than what you made of it. Tutors are interested in what you learned, what surprised you, what you disagreed with and what you want to find out next.'),
        {
            type: 'callout',
            label: 'Worth knowing',
            text: 'For Oxford and Cambridge, most of your statement should focus on your subject. Extracurricular activities such as sport, music or volunteering can be mentioned briefly, especially if they connect to your course, but they shouldn’t take up much space. Remember that the same statement goes to all five of your university choices, so it needs to work for each of them.',
        },
        { type: 'section', label: 'Section two', title: 'Understanding the format' },
        { type: 'p', text: 'UCAS has moved away from a single free-form essay. Instead, the personal statement is now structured around three questions, each answered in its own section:' },
        { type: 'stage', n: 1, title: 'Why do you want to study this course or subject?' },
        { type: 'p', text: 'This is where you show your motivation and the ideas that excite you most. For Oxbridge, it’s often the heart of your statement.' },
        { type: 'stage', n: 2, title: 'How have your qualifications and studies helped you to prepare for this course or subject?' },
        { type: 'p', text: 'Here you connect what you’ve learned at school, and how you’ve taken it further, to the course you’re applying for.' },
        { type: 'stage', n: 3, title: 'What else have you done to prepare outside of education, and why are these experiences useful?' },
        { type: 'p', text: 'This covers relevant experiences beyond your formal studies, such as wider reading, projects, work experience or activities, and what they’ve taught you.' },
        {
            type: 'p',
            text: 'There is an overall character limit shared across the three answers, and each answer has a minimum length. Because the format is relatively new, always check the latest UCAS guidance for the exact requirements before you start writing.',
        },
        { type: 'section', label: 'Section three', title: 'Step by step' },
        { type: 'stage', n: 1, title: 'Gather your material' },
        {
            type: 'p',
            text: 'Before writing anything, collect everything you might draw on: books and articles you’ve read, lectures and podcasts, projects, competitions, work experience and moments in class that sparked your interest. Note down what you thought about each one, not just what it was.',
        },
        tryThis(
            'Make a list of everything you’ve read, watched or done connected to your subject.',
            'Next to each item, write one sentence on what you found interesting or what it made you think.'
        ),
        { type: 'stage', n: 2, title: 'Find your thread' },
        {
            type: 'p',
            text: 'Look back over your list and ask which ideas you keep returning to. The strongest statements usually have a clear sense of what fascinates the writer, rather than trying to cover everything.',
        },
        tryThis(
            'Circle the three or four items you could talk about with the most enthusiasm.',
            'Ask yourself what connects them. That connection is often the thread of your statement.'
        ),
        { type: 'stage', n: 3, title: 'Plan your answers' },
        {
            type: 'p',
            text: 'Decide which material belongs under each of the three questions. Aim for a balance that reflects what matters most for your course, with your academic interest at the centre.',
        },
        tryThis('Write a short bullet-point plan for each question before drafting.', 'Check that most of your plan is about your subject.'),
        { type: 'stage', n: 4, title: 'Write a first draft' },
        {
            type: 'p',
            text: 'Get your ideas down without worrying about word count or polish. A first draft is meant to be imperfect. It’s much easier to improve something that exists than to write the perfect sentence first time.',
        },
        tryThis('Set aside a focused hour to write a complete draft in one go.', 'Don’t edit as you write. Save that for later.'),
        { type: 'stage', n: 5, title: 'Show your thinking' },
        {
            type: 'p',
            text: 'Go through your draft and look for places where you describe what you did without saying what you thought. Replace lists with reflection: what you learned, what surprised you, what you questioned and where it led you next.',
        },
        tryThis(
            'For every book or activity you mention, check you’ve said what you made of it.',
            'Replace general claims such as “I am fascinated by…” with a specific example that shows it.'
        ),
        { type: 'stage', n: 6, title: 'Get feedback' },
        {
            type: 'p',
            text: 'Ask your Access Oxbridge mentor to read your draft and give honest comments. Fresh eyes spot gaps, repetition and unclear writing that you can no longer see.',
        },
        tryThis(
            'Ask your reader a specific question, such as “Does my interest in the subject come across clearly?”',
            'Listen to feedback with an open mind, but remember the final decisions are yours.'
        ),
        { type: 'stage', n: 7, title: 'Redraft and cut' },
        {
            type: 'p',
            text: 'Most strong statements go through several drafts. Each time, sharpen your sentences, remove anything that doesn’t add to the picture of you as a thinker, and make sure you’re within the character limit.',
        },
        tryThis(
            'Read each sentence and ask, “What does this tell a tutor about me?” If the answer is “not much”, cut it.',
            'Read your statement aloud to catch clumsy phrasing.'
        ),
        { type: 'stage', n: 8, title: 'Final checks' },
        {
            type: 'p',
            text: 'Before submitting, check spelling, grammar and facts carefully, and make sure every word is your own. Your statement should sound like you at your most thoughtful, not like someone else.',
        },
        tryThis('Check every title, author and fact you mention.', 'Ask someone to proofread the final version.'),
        { type: 'section', label: 'Section four', title: 'Common mistakes' },
        term('Listing without reflecting', 'A long list of books shows what you’ve read, not how you think. One or two ideas explored properly are far more impressive than ten titles mentioned in passing.'),
        term('Clichés and famous quotes', 'Openings such as “I have always been passionate about…” or a well-known quotation take up valuable space and tell tutors very little. Start with something specific to you instead.'),
        term('Too much on extracurricular activities', 'For Oxbridge, tutors are mainly interested in your subject. Keep other activities brief unless they connect directly to your course.'),
        term('Claiming more than you can discuss', 'Tutors may ask about anything in your statement. Only mention books and ideas you’ve genuinely engaged with and could talk about confidently.'),
        term('Letting AI write it for you', 'Your statement must be your own work. UCAS and the universities expect it to reflect your own ideas and words, and a statement that doesn’t sound like you is likely to fall flat at interview.'),
        { type: 'section', label: 'Section five', title: 'Your statement and your interview' },
        {
            type: 'p',
            text: 'If you’re invited to interview, tutors may use your statement as a starting point for discussion. They might ask you to expand on an idea, explain a view you’ve expressed or apply your thinking to something new.',
        },
        tryThis(
            'Reread your statement and note any point a tutor might ask about.',
            'Revisit the main books and ideas you mention, so they’re fresh in your mind.',
            'Practise explaining each idea out loud, and think about how you’d respond if someone disagreed.'
        ),
        {
            type: 'checklist',
            label: 'Before you submit',
            title: 'Final checklist',
            items: [
                'Most of my statement is about my subject',
                'I could discuss everything I’ve mentioned',
                'I’ve reflected on what I read and did, not just listed it',
                'My Access Oxbridge mentor has given me feedback',
                'I’ve answered each of the three questions',
                'I’ve checked spelling, grammar and facts',
                'I’ve checked the current UCAS requirements',
                'Every word is my own',
            ],
        },
        officialLinks(),
    ],
}

const admissionsTests: ParentGuide = {
    slug: 'admissions-tests-explained',
    eyebrow: 'A guide for students',
    title: 'Admissions Tests Explained',
    subtitle: 'What they are, how they work and how to prepare',
    summary: 'Which courses set a test, what each kind checks and how to prepare.',
    blocks: [
        {
            type: 'lead',
            text: 'Admissions tests can feel like one of the most daunting parts of an Oxbridge application. They’re unfamiliar, they’re challenging, and they’re different from the exams you sit at school.',
        },
        {
            type: 'p',
            text: 'The good news is that every test follows clear patterns, and steady, well-planned preparation makes a real difference. This guide explains what the tests are for, how to find out which one you need, and how to prepare step by step.',
        },
        { type: 'section', label: 'Section one', title: 'What admissions tests are for' },
        term('Comparing applicants fairly', 'Applicants come from many different schools and study a wide range of qualifications. A common test gives tutors a way to compare everyone on the same questions, under the same conditions.'),
        term('Seeing how you think', 'Most tests are less about how much you’ve memorised and more about how you use what you know. They often present unfamiliar problems to see how you reason, analyse and work things out under pressure.'),
        {
            type: 'callout',
            label: 'Worth knowing',
            text: 'Admissions tests are designed to be difficult, so that they can tell strong applicants apart. Nobody is expected to find every question easy, and finding a test hard is completely normal, even for students who go on to receive offers.',
        },
        { type: 'section', label: 'Section two', title: 'The main types of test' },
        { type: 'p', text: 'Most Oxford and Cambridge courses require an admissions test, though some don’t. The tests vary by course, but most focus on one or more of these broad skills:' },
        term('Thinking skills and critical reasoning', 'Questions that test how you analyse arguments, spot assumptions, draw conclusions and solve problems logically.'),
        term('Mathematical and scientific problem-solving', 'Questions that ask you to apply mathematical or scientific knowledge, often at around A-level standard, to problems you haven’t seen before.'),
        term('Reading and analysing texts', 'Tasks that ask you to read a passage closely, interpret it and write a clear, well-structured response.'),
        term('Aptitude for specific subjects', 'Some subjects, such as law or medicine, use tests designed to measure the particular skills those courses need.'),
        { type: 'section', label: 'Section three', title: 'Finding out what you need' },
        term('Check the official course page', 'Each course page on the university’s website says whether a test is required and which one. This is the most reliable place to check, as requirements can change from year to year.'),
        term('Register separately', 'Registering for a test is often a separate step from your UCAS application, with its own deadline. Missing it can mean you’re unable to sit the test, so find out early.'),
        term('Know where you’ll sit it', 'Tests are usually taken at a school or an approved test centre. Check where and how you’ll take yours well in advance.'),
        term('Arrange any support you need', 'If you’re entitled to access arrangements, such as extra time, you’ll usually need to request them in advance. Speak to your school as early as possible.'),
        tryThis(
            'Find your course page today and write down the name of your test and its registration deadline.',
            'Check with your school or test centre how registration works.',
            'Put every test-related deadline in your calendar.'
        ),
        { type: 'section', label: 'Section four', title: 'How to prepare, step by step' },
        { type: 'stage', n: 1, title: 'Understand the test' },
        {
            type: 'p',
            text: 'Start by learning exactly what your test involves: how many sections it has, how long you get, what types of question it includes and what knowledge it assumes. The official test information is the best place to find this.',
        },
        tryThis('Read the official guidance for your test from start to finish.', 'Make a one-page summary of the format, timing and content.'),
        { type: 'stage', n: 2, title: 'Try a past paper' },
        {
            type: 'p',
            text: 'Work through an official past paper or specimen paper without a time limit. The aim isn’t to get a good score, but to see what the questions feel like and where you stand.',
        },
        tryThis('Do your first paper somewhere quiet, with no distractions.', 'Note which questions felt comfortable and which felt hard.'),
        { type: 'stage', n: 3, title: 'Find your gaps' },
        {
            type: 'p',
            text: 'Look closely at the questions you found difficult. Is it a particular topic, a type of question, or the way questions are worded? Knowing exactly where your gaps are makes your preparation far more efficient.',
        },
        tryThis('Sort the questions you got wrong into groups by topic or question type.', 'Pick the two or three groups that cost you the most marks to focus on first.'),
        { type: 'stage', n: 4, title: 'Build your skills' },
        {
            type: 'p',
            text: 'Work on your weaker areas steadily over several weeks. Revisit the relevant topics, practise similar questions and get help with anything you’re stuck on.',
        },
        tryThis('Set aside short, regular sessions for test preparation each week.', 'Ask your Access Oxbridge mentor or a teacher to explain anything you’re unsure about.'),
        { type: 'stage', n: 5, title: 'Practise under timed conditions' },
        {
            type: 'p',
            text: 'Once you’re more confident, start doing papers or sections under real time limits. Timing is one of the biggest challenges in admissions tests, and practice is the only way to get used to the pace.',
        },
        tryThis('Use a timer and stick to the official time limits.', 'Practise deciding when to move on from a question rather than getting stuck.'),
        { type: 'stage', n: 6, title: 'Learn from your mistakes' },
        {
            type: 'p',
            text: 'After every practice paper, review each wrong answer carefully. Work out why you got it wrong, whether it was a gap in knowledge, a misread question or running out of time, and what you’d do differently.',
        },
        tryThis('Keep a log of your mistakes and the lesson from each one.', 'Reread your log before every new practice paper.'),
        { type: 'section', label: 'Section five', title: 'On the day' },
        term('Be prepared', 'Check the time and place of your test, what you need to bring, including any identification, and how you’ll get there. Aim to arrive with plenty of time to spare.'),
        term('Manage your time', 'Keep an eye on the clock throughout. If a question is taking too long, make your best attempt, move on and come back to it if you have time.'),
        term('If you get stuck', 'Getting stuck is normal in these tests. Take a breath, reread the question, and focus on what you can work out rather than what you can’t.'),
        term('Stay calm', 'Get a good night’s sleep beforehand and eat a proper breakfast. Remember that everyone else is finding the test challenging too.'),
        { type: 'section', label: 'Section six', title: 'Keeping it in perspective' },
        {
            type: 'p',
            text: 'Your test result is only one part of your application. Tutors also consider your grades, personal statement, school reference, any written work and, if you’re shortlisted, your interview. A test that felt difficult doesn’t mean you did badly, since the questions are designed to stretch everyone. Once it’s over, let it go and turn your attention to the next stage.',
        },
        {
            type: 'checklist',
            label: 'Keeping track',
            title: 'Preparation checklist',
            items: [
                'Checked whether my course needs a test',
                'Identified my weaker areas',
                'Registered for my test before the deadline',
                'Practised papers under timed conditions',
                'Arranged any access arrangements I need',
                'Reviewed every mistake',
                'Read the official guidance for my test',
                'Checked the time, place and what to bring',
                'Tried a past paper without timing',
                'Planned how to get there',
            ],
        },
        officialLinks(),
    ],
}

const interview: ParentGuide = {
    slug: 'inside-an-oxbridge-interview',
    eyebrow: 'A guide for students',
    title: 'Inside an Oxbridge Interview',
    subtitle: 'What really happens, and how to show tutors how you think',
    summary: 'What really happens in the room, and how to practise thinking aloud.',
    blocks: [
        {
            type: 'lead',
            text: 'Oxbridge interviews have a reputation for being intimidating, full of strange questions and impossible puzzles. The reality is very different. An interview is an academic conversation about a subject you love, with people who love it too.',
        },
        {
            type: 'p',
            text: 'With the right preparation, many students find their interviews challenging but genuinely enjoyable. This guide explains what really happens, what tutors are looking for, and how to prepare so you can show them how you think.',
        },
        { type: 'section', label: 'Section one', title: 'What an interview is really like' },
        term('A conversation about your subject', 'Most interviews involve one or two tutors who teach your subject, and last a relatively short time. In recent years, many interviews have taken place online.'),
        term('What might come up', 'You might be asked to discuss a short passage, work through a problem, interpret an image or set of data, or talk about something from your personal statement. Often, a tutor will start with something familiar and then take the discussion somewhere new.'),
        term('More than one interview', 'Some students have two or more interviews, sometimes with a different college. This is completely normal and gives you more than one chance to show what you can do.'),
        { type: 'section', label: 'Section two', title: 'What tutors are looking for' },
        { type: 'p', text: 'Tutors are much more interested in how you think than in what you already know. They want to see you:' },
        term('Engage with new ideas', 'Show curiosity about material you haven’t seen before, rather than retreating to what you’ve revised.'),
        term('Reason things through', 'Work step by step towards an answer, explaining your thinking as you go.'),
        term('Respond to hints and challenges', 'Take on board a suggestion or an objection and use it to move your thinking forward.'),
        term('Show genuine interest', 'Let your enthusiasm for the subject come through. Tutors can tell when a student is enjoying the discussion.'),
        {
            type: 'callout',
            label: 'Worth knowing',
            text: 'An interview is a little like a short version of a tutorial or supervision, the small-group teaching at the heart of an Oxbridge degree. In many ways, tutors are asking themselves: would I enjoy teaching this student, and are they a good fit for this course and university?',
        },
        { type: 'section', label: 'Section three', title: 'Myths and reality' },
        {
            type: 'myths',
            items: [
                {
                    myth: '“They ask trick questions.”',
                    reality: 'Questions may be unusual, but they’re designed to start a discussion, not to catch you out. Tutors want to see you at your best.',
                },
                {
                    myth: '“You need to know the right answer.”',
                    reality: 'Often there isn’t a single right answer. Tutors care far more about how you approach a question than whether you reach a particular conclusion.',
                },
                {
                    myth: '“If you struggle, you’ve failed.”',
                    reality: 'Interviews are meant to stretch you until you reach the edge of what you know. Struggling is expected. What matters is how you work through it.',
                },
            ],
        },
        { type: 'section', label: 'Section four', title: 'How to prepare, step by step' },
        { type: 'stage', n: 1, title: 'Know your personal statement' },
        {
            type: 'p',
            text: 'Tutors may ask about anything in your statement, so reread it carefully and make sure you can discuss every book, idea and experience you mention in more depth.',
        },
        tryThis('Highlight every point in your statement a tutor might ask about.', 'For each one, prepare to explain what you think and why.'),
        { type: 'stage', n: 2, title: 'Go deeper into your subject' },
        {
            type: 'p',
            text: 'Revisit the reading you’ve done and keep exploring. The more widely you’ve thought about your subject, the more comfortable you’ll be when a discussion moves into new territory.',
        },
        tryThis('Read something new connected to your subject each week before your interview.', 'Ask yourself what you agree and disagree with in everything you read.'),
        { type: 'stage', n: 3, title: 'Practise thinking aloud' },
        {
            type: 'p',
            text: 'In an interview, tutors need to hear your reasoning, not just your conclusions. Thinking aloud can feel strange at first, so it helps to practise.',
        },
        tryThis('Talk through a problem or an idea out loud, explaining each step as you go.', 'Explain a topic from your subject to a friend or family member who doesn’t know it.'),
        { type: 'stage', n: 4, title: 'Tackle unfamiliar problems' },
        {
            type: 'p',
            text: 'Get used to working on questions you haven’t seen before, so that the unfamiliar feels less daunting on the day. Focus on how you approach each problem rather than whether you solve it.',
        },
        tryThis('Work through challenging questions beyond your school syllabus.', 'When you’re stuck, practise breaking the problem into smaller parts.'),
        { type: 'stage', n: 5, title: 'Have practice interviews' },
        {
            type: 'p',
            text: 'Practice interviews are one of the best ways to prepare. They help you get used to the format, think under pressure and receive feedback on how you come across.',
        },
        tryThis('Arrange practice interviews with your Access Oxbridge mentor.', 'After each one, note what went well and one thing to improve.'),
        { type: 'stage', n: 6, title: 'Get your setup ready' },
        { type: 'p', text: 'If your interview is online, prepare your space and technology well in advance, so that nothing distracts you on the day.' },
        tryThis(
            'Choose a quiet, well-lit room with a plain background.',
            'Test your camera, microphone and internet connection beforehand.',
            'Keep paper and a pen nearby for working things out.'
        ),
        { type: 'section', label: 'Section five', title: 'In the interview' },
        term('Listen carefully', 'Take your time to understand each question before you answer. It’s fine to pause and think.'),
        term('Ask if you’re unsure', 'If a question isn’t clear, ask the tutor to repeat or rephrase it. This shows you’re engaging carefully, not that you’re struggling.'),
        term('Think aloud', 'Talk the tutor through your reasoning, even when you’re not sure where it will lead.'),
        term('If you get stuck', 'Say what you do know, try a different approach, or explain where you’re getting stuck. Tutors often offer a hint to help you move forward.'),
        term('Respond to hints and challenges', 'When a tutor suggests something or disagrees with you, take it seriously and think it through. Use it to build on your answer.'),
        term('Change your mind if you need to', 'If the evidence or a tutor’s point shows you were wrong, it’s perfectly fine to say so and adjust your view. This is exactly what good academics do.'),
        term('Ask a question at the end', 'If you’re invited to ask a question, choose one that genuinely interests you about the subject or the course.'),
        { type: 'section', label: 'Section six', title: 'Afterwards' },
        {
            type: 'p',
            text: 'It’s natural to replay your interview in your head, but try not to analyse every moment. Students very often misjudge how an interview went: a conversation that felt difficult may have been exactly what tutors wanted to see. Once it’s over, take a break, do something you enjoy and turn your attention to whatever comes next.',
        },
        {
            type: 'checklist',
            label: 'Keeping track',
            title: 'Interview preparation checklist',
            items: [
                'Reread my personal statement',
                'Had practice interviews with my mentor',
                'Prepared to discuss everything I mentioned',
                'Tested my camera, microphone and internet',
                'Revisited and extended my reading',
                'Prepared a quiet space with paper and a pen',
                'Practised thinking aloud',
                'Checked my interview time and details',
                'Worked on unfamiliar problems',
                'Thought of a question to ask at the end',
            ],
        },
        officialLinks(),
    ],
}

const chooseCollege: ParentGuide = {
    slug: 'how-to-choose-a-college',
    eyebrow: 'A guide for students',
    title: 'How to Choose a College',
    subtitle: 'Finding a place where you’ll feel at home',
    summary: 'How colleges differ, and when an open application makes sense.',
    blocks: [
        {
            type: 'lead',
            text: 'Choosing a college can feel like one of the biggest decisions in your Oxbridge application. With so many to choose from, each with its own history and character, it’s easy to worry about getting it wrong.',
        },
        {
            type: 'p',
            text: 'Here’s the reassuring truth: your choice of college matters far less for your chances than many people think. It does matter for your day-to-day experience, though, so it’s worth choosing thoughtfully. This guide explains how colleges work and how to find one where you’ll feel at home.',
        },
        { type: 'section', label: 'Section one', title: 'What a college is' },
        {
            type: 'p',
            text: 'Oxford and Cambridge are each made up of a central university and a number of independent colleges. Your college is the community you belong to throughout your degree: it’s where you’ll usually live, eat, socialise and receive much of your teaching, through tutorials at Oxford or supervisions at Cambridge.',
        },
        {
            type: 'p',
            text: 'The university, meanwhile, sets your course, organises lectures and runs your exams. This means that everyone on the same course studies the same syllabus and sits the same exams, whichever college they belong to.',
        },
        { type: 'section', label: 'Section two', title: 'Does your choice affect your chances?' },
        {
            type: 'p',
            text: 'Both universities have systems designed to make sure strong applicants are considered fairly, wherever they apply. At Cambridge, this is called the pool: strong applicants whose college can’t offer them a place can be considered by other colleges. At Oxford, applicants can be reallocated so that they are interviewed or considered by colleges other than their first choice.',
        },
        { type: 'p', text: 'Because of these systems, trying to pick a “less competitive” college rarely improves your chances.' },
        {
            type: 'callout',
            label: 'Worth knowing',
            text: 'Some students receive an offer from a college they didn’t apply to. This is completely normal, and an offer from any college is a full offer to study at the university.',
        },
        { type: 'section', label: 'Section three', title: 'What to consider' },
        { type: 'p', text: 'Since your choice won’t make or break your application, focus on what will make a difference to your daily life.' },
        term('Your course', 'Not every college offers every course, and some take only a few students in each subject. Check that your course is offered before anything else.'),
        term('Size and atmosphere', 'Some colleges are large and lively, others small and close-knit. Think about which kind of community suits you.'),
        term('Accommodation', 'Colleges differ in the accommodation they offer, such as how many years they house students on site and what the rooms are like.'),
        term('Location', 'Some colleges are in the city centre, close to lectures and libraries; others are further out, often with more space and greenery.'),
        term('Facilities', 'Libraries, study spaces, sports grounds, music rooms and other facilities vary from college to college.'),
        term('Age and character', 'Some colleges are centuries old with grand buildings and long traditions; others are newer, with a more modern feel. A few colleges admit only mature students or only women, so check eligibility too.'),
        term('Support', 'Every college has staff dedicated to students’ welfare and academic progress. It’s worth finding out what support each college offers.'),
        { type: 'section', label: 'Section four', title: 'Open applications' },
        {
            type: 'p',
            text: 'If you don’t have a preference, you can make an open application instead of choosing a college. A college is then allocated to you, and your application is considered in exactly the same way as everyone else’s.',
        },
        {
            type: 'p',
            text: 'An open application can suit you if you genuinely don’t mind where you go, or if you’ve looked at several colleges and found them equally appealing. If you do have a preference, though, it’s usually best to choose that college.',
        },
        { type: 'section', label: 'Section five', title: 'How to decide, step by step' },
        { type: 'stage', n: 1, title: 'Check which colleges offer your course' },
        { type: 'p', text: 'Start with the colleges that offer your course. Each university’s website lists which colleges take students in each subject.' },
        tryThis('Write down every college that offers your course.', 'Check whether any have eligibility rules that apply to you.'),
        { type: 'stage', n: 2, title: 'Make a shortlist' },
        { type: 'p', text: 'Narrow your list using the factors that matter most to you, such as size, location or accommodation. Aim for a shortlist of three to five colleges.' },
        tryThis('Pick your top three factors from Section three.', 'Compare each college on your list against those factors.'),
        { type: 'stage', n: 3, title: 'Visit or explore online' },
        {
            type: 'p',
            text: 'Nothing beats seeing a college for yourself. Open days are a great opportunity, and many colleges also offer virtual tours and videos if you can’t visit in person.',
        },
        tryThis('Visit your shortlisted colleges on an open day if you can.', 'Take a virtual tour of any you can’t visit.'),
        { type: 'stage', n: 4, title: 'Talk to people' },
        {
            type: 'p',
            text: 'Current students can give you an honest sense of what life is like at their college. You can also discuss your options with your Access Oxbridge mentor, who can give unique insight into college selection and recommendations.',
        },
        tryThis('Prepare a few questions to ask current students on open days.', 'Discuss your shortlist with your Access Oxbridge mentor.'),
        { type: 'stage', n: 5, title: 'Make your choice and move on' },
        {
            type: 'p',
            text: 'Once you’ve chosen, put the decision behind you. Your energy is far better spent on your personal statement, test preparation and wider reading than on second-guessing your college.',
        },
        tryThis('Make your decision by a set date, so it doesn’t drag on.', 'Once it’s made, turn your attention to the rest of your application.'),
        {
            type: 'checklist',
            label: 'Keeping track',
            title: 'College choice checklist',
            items: [
                'Checked which colleges offer my course',
                'Spoken to current students',
                'Checked any eligibility rules',
                'Discussed my options with my mentor',
                'Chosen my top three factors',
                'Considered an open application',
                'Made a shortlist of three to five colleges',
                'Made my final choice',
                'Visited or toured my shortlisted colleges',
            ],
        },
        officialLinks(),
    ],
}

const rightCourse: ParentGuide = {
    slug: 'find-the-right-course',
    eyebrow: 'A guide for students',
    title: 'How to Find the Right Course at Oxbridge',
    subtitle: 'Choosing a subject you’ll love for three or four years',
    summary: 'Exploring every option, reading course pages properly and choosing with confidence.',
    blocks: [
        {
            type: 'lead',
            text: 'Choosing your course is the most important decision in your Oxbridge application. It shapes everything that follows, from the tests you take and the questions you’re asked at interview to what you’ll study every day for your whole degree.',
        },
        { type: 'p', text: 'This guide will help you explore your options, read course pages properly and find a course that genuinely excites you.' },
        { type: 'section', label: 'Section one', title: 'Why the course matters so much' },
        {
            type: 'p',
            text: 'At Oxford and Cambridge, you apply for a specific course from the start. Teaching is intense and focused: you’ll spend much of your time reading, writing and discussing your subject in depth with experts, often in very small groups.',
        },
        { type: 'p', text: 'That’s why genuine enthusiasm matters so much. It’s what tutors look for in your application, and it’s what will keep you motivated through demanding terms.' },
        {
            type: 'callout',
            label: 'Worth knowing',
            text: 'Choosing a course you love matters far more than choosing one that seems prestigious, strategic or less competitive. Students who are genuinely interested in their subject write stronger applications, perform better at interview and enjoy their degree more.',
        },
        { type: 'section', label: 'Section two', title: 'Looking beyond school subjects' },
        { type: 'p', text: 'Many Oxbridge courses aren’t taught at school, so it’s easy to overlook them. A few examples include:' },
        term('Philosophy, Politics and Economics (Oxford)', 'A course combining three subjects to explore how societies are organised, governed and make decisions.'),
        term('Human, Social, and Political Sciences (Cambridge)', 'A broad course covering politics, sociology, anthropology and related subjects.'),
        term('Archaeology and Anthropology (Oxford)', 'The study of human societies and cultures, past and present.'),
        term('Land Economy (Cambridge)', 'A course combining law, economics and the environment.'),
        term('Linguistics (Cambridge)', 'The scientific study of language: how it works, how it’s learned and how it changes.'),
        {
            type: 'p',
            text: 'Both universities also offer joint honours courses that combine two subjects, such as a language with another subject. These can be a great fit if your interests span more than one area. It’s well worth browsing the full list of courses before making up your mind.',
        },
        { type: 'section', label: 'Section three', title: 'Reading a course page properly' },
        { type: 'p', text: 'Every course has a page on the university’s website. These pages are full of useful detail that’s easy to skim past. Look carefully at:' },
        term('Course structure and options', 'What you’ll study in each year, which parts are compulsory, and how much choice you’ll have later on.'),
        term('How it’s taught', 'The balance of tutorials or supervisions, lectures, classes and practical work.'),
        term('Entrance requirements', 'The grades you’ll need and which subjects are required or recommended. A “required” subject is essential, while a “recommended” one will help but isn’t compulsory.'),
        term('Tests and written work', 'Whether you’ll need to take an admissions test or submit written work as part of your application.'),
        term('Suggested reading', 'Many courses suggest books or resources for applicants. These give a great sense of what the course is really like.'),
        {
            type: 'callout',
            label: 'Worth knowing',
            text: 'Courses with similar names can be quite different at Oxford and Cambridge. Always compare the course pages side by side rather than assuming they’re the same.',
        },
        { type: 'section', label: 'Section four', title: 'Finding your course, step by step' },
        { type: 'stage', n: 1, title: 'Start with what you enjoy' },
        { type: 'p', text: 'Think about the subjects, topics and questions you find most interesting, in and out of school. Your best course is likely to grow from these.' },
        tryThis('List the topics you’ve enjoyed most in school and in your own reading.', 'Note what they have in common.'),
        { type: 'stage', n: 2, title: 'Explore the full list of courses' },
        { type: 'p', text: 'Look through every course offered at both universities, including those you haven’t studied before. You may find something that fits your interests better than you expected.' },
        tryThis('Go through the full course lists for Oxford and Cambridge.', 'Shortlist every course that sparks your curiosity, however unfamiliar.'),
        { type: 'stage', n: 3, title: 'Read course pages closely' },
        { type: 'p', text: 'For each course on your shortlist, read the course page carefully, using the points in Section three as a guide.' },
        tryThis('Compare your shortlisted courses side by side.', 'Check the entrance requirements against your current and planned subjects.'),
        { type: 'stage', n: 4, title: 'Test your interest' },
        {
            type: 'p',
            text: 'Before committing, explore each subject more deeply. Read around it, watch lectures and try taster events or online courses where you can. Your interest should grow, not fade, the more you learn.',
        },
        tryThis('Read one book or a few articles for each course on your shortlist.', 'Notice which subject you keep wanting to come back to.'),
        { type: 'stage', n: 5, title: 'Talk it through' },
        {
            type: 'p',
            text: 'Discussing your options with others can help you see things more clearly. Your Access Oxbridge mentor can share insight into different courses and help you weigh them up, and your teachers know your strengths well.',
        },
        tryThis('Talk through your shortlist with your Access Oxbridge mentor.', 'Ask a teacher which subjects they think suit the way you think.'),
        { type: 'section', label: 'Section five', title: 'Questions to ask yourself' },
        { type: 'p', text: 'Before you decide, take some time to reflect honestly on these questions:' },
        {
            type: 'list',
            items: [
                'Would I happily read about this subject in my spare time?',
                'Can I imagine studying it in depth for three or four years?',
                'Do I enjoy the way this subject is taught and assessed?',
                'Do I meet, or will I meet, the entrance requirements?',
                'Am I choosing this for myself, or because of what others expect?',
            ],
        },
        {
            type: 'checklist',
            title: 'Course choice checklist',
            items: [
                'Listed the topics I enjoy most',
                'Checked the entrance requirements',
                'Explored the full course lists',
                'Read around each shortlisted subject',
                'Shortlisted courses that interest me',
                'Discussed my options with my mentor',
                'Read each course page closely',
                'Made my final choice',
            ],
        },
        officialLinks(),
    ],
}

const superCurricular: ParentGuide = {
    slug: 'super-curricular-reading',
    eyebrow: 'A guide for students',
    title: 'A Guide to Super-curricular Reading',
    subtitle: 'How to read beyond the syllabus, and make it count',
    summary: 'What to read beyond the syllabus, how to read actively and how to use it.',
    blocks: [
        {
            type: 'lead',
            text: 'Reading beyond your school syllabus is one of the best ways to discover what really excites you about your subject. It’s also something Oxford and Cambridge tutors look for in every part of your application, from your personal statement to your interview.',
        },
        {
            type: 'p',
            text: 'This guide explains what super-curricular reading is, what to read, how to get the most out of it, and how to turn it into a habit that strengthens your application.',
        },
        { type: 'section', label: 'Section one', title: 'What super-curricular reading is' },
        {
            type: 'p',
            text: 'Super-curricular activities take your interest in your subject further than your school courses. Extracurricular activities, such as sport, music or drama, are about life beyond your studies. Both are valuable, but for Oxbridge, super-curricular work matters most, because it shows tutors how you engage with your subject when nobody is asking you to.',
        },
        {
            type: 'p',
            text: 'Reading is the most flexible and accessible form of super-curricular activity. It lets you explore the questions that interest you, at your own pace, and discover areas of your subject you may never meet at school.',
        },
        {
            type: 'callout',
            label: 'Worth knowing',
            text: 'Quality matters far more than quantity. A few books or articles you’ve genuinely thought about, questioned and followed up are worth much more than a long list of titles you’ve skimmed.',
        },
        { type: 'section', label: 'Section two', title: 'What to read' },
        term('Books for curious readers', 'Many leading academics write books aimed at interested general readers. These are often the best place to start, introducing big ideas clearly and engagingly.'),
        term('Magazines and journals', 'Publications that cover new research, debates and discoveries in your subject help you stay up to date and see how ideas develop.'),
        term('Academic articles and essays', 'As your confidence grows, try reading shorter academic articles or essays. You won’t understand everything, and that’s fine. Grappling with challenging material is part of the point.'),
        term('Podcasts and lectures', 'Recorded lectures, talks and podcasts by experts are a great way to explore ideas when you’re travelling or taking a break from the page.'),
        term(
            'Finding good starting points',
            'Course reading lists on university websites, references and further reading in books you’ve enjoyed, and recommendations from teachers are all excellent places to look. Your Access Oxbridge mentor can also recommend material to get you started and help you as your exploration progresses.'
        ),
        { type: 'section', label: 'Section three', title: 'How to read actively' },
        {
            type: 'p',
            text: 'Reading for an Oxbridge application isn’t about absorbing information. It’s about engaging with ideas. Active reading turns every book into something you can think and talk about.',
        },
        term('Read with questions in mind', 'Before you start, ask yourself what you want to find out. As you read, notice the questions the author is trying to answer.'),
        term('Note what you think', 'Record your own reactions, not just a summary of what the author says. What convinced you? What didn’t? What surprised you?'),
        term('Agree and disagree', 'Look for points you’d challenge, assumptions you’d question and evidence you’d want to see. Tutors are interested in your view, not just the author’s.'),
        term('Follow up', 'When an idea grabs you, chase it. Look up a reference, read another view on the same topic, or find out what has happened since.'),
        { type: 'section', label: 'Section four', title: 'Building a reading habit, step by step' },
        { type: 'stage', n: 1, title: 'Start with what interests you' },
        { type: 'p', text: 'You’ll read more, and think more deeply, if you begin with topics you genuinely find fascinating. Your interests will widen naturally as you go.' },
        tryThis('Write down three questions about your subject that you’d love to know more about.', 'Find one book or article that explores each of them.'),
        { type: 'stage', n: 2, title: 'Set a realistic routine' },
        { type: 'p', text: 'Regular reading, even in short sessions, adds up quickly. A routine you can keep is better than an ambitious plan you abandon.' },
        tryThis('Set aside a regular time each week for wider reading.', 'Keep a book or article with you for spare moments.'),
        { type: 'stage', n: 3, title: 'Keep a reading journal' },
        {
            type: 'p',
            text: 'A reading journal helps you remember what you’ve read and, more importantly, what you thought about it. It will be invaluable when you write your personal statement and prepare for interview.',
        },
        tryThis('After each book or article, write a short note on the main argument and your own response.', 'Add any questions it raised that you’d like to explore further.'),
        { type: 'stage', n: 4, title: 'Follow the threads' },
        { type: 'p', text: 'Let one piece of reading lead to the next. Following a line of enquiry across several sources shows real intellectual curiosity and builds deeper understanding.' },
        tryThis('Check the references or further reading at the end of anything you enjoy.', 'Look for a source that takes a different view on the same topic.'),
        { type: 'stage', n: 5, title: 'Talk about what you read' },
        { type: 'p', text: 'Explaining an idea out loud is one of the best ways to understand it, and it’s excellent practice for interviews.' },
        tryThis('Discuss your reading with your Access Oxbridge mentor, a teacher or a friend.', 'Try summarising a book’s argument in two minutes, then giving your view on it.'),
        { type: 'section', label: 'Section five', title: 'Using your reading in your application' },
        term('Your personal statement', 'Choose one or two pieces of reading that genuinely shaped your thinking, and reflect on what you made of them rather than listing titles.'),
        term('Admissions tests', 'Wide reading builds the skills many tests assess, from analysing arguments to understanding unfamiliar texts.'),
        term('Your interview', 'Tutors may ask about anything you’ve mentioned, or start a discussion that draws on wider knowledge of your subject. The more you’ve read and thought about, the more confident you’ll feel.'),
        {
            type: 'callout',
            label: 'Worth knowing',
            text: 'Only mention reading in your application that you could discuss confidently. Tutors can quickly tell the difference between a book a student has genuinely engaged with and one they’ve only heard about.',
        },
        {
            type: 'checklist',
            title: 'Reading habit checklist',
            items: [
                'Written down three questions I want to explore',
                'Followed up references from a book I enjoyed',
                'Found reading for each question',
                'Read a different view on the same topic',
                'Set a regular time for wider reading',
                'Discussed my reading with my mentor',
                'Started a reading journal',
                'Chosen reading to reflect on in my statement',
            ],
        },
        officialLinks('Always check the latest information on the official websites:'),
    ],
}

/** In the order a student meets them: course, college, reading, statement, tests, interview. */
export const CHILD_GUIDES: ParentGuide[] = [rightCourse, chooseCollege, superCurricular, personalStatement, admissionsTests, interview]
