/* Generated from two real interviews on the local backend (Deloitte USI, finished; Amazon SDE 1, ended early).
 * Content is verbatim apart from `question_budget`, added to each round to match the current backend.
 * Timestamps are the originals; fixtures.ts rebases them relative to the time the preview loads. */
import type { CompanyBlueprint, FinalReport, InterviewProfile, RoundScore, TranscriptEntry } from "../types";

export const deloitteProfile: InterviewProfile = {
  "company": "Deloitte USI",
  "role": "Analyst - Software Engineering",
  "experience": "fresher",
  "job_description": "Campus hiring 2026, Analyst (Software Engineering). Skills: Python or Java, SQL, OOP, data structures, basic web development. Strong communication; campus process includes aptitude, group discussion, technical and HR interviews.",
  "resume_text": "B.Tech CSE 2026. Projects: Expense tracker web app (React, FastAPI, PostgreSQL) with JWT auth; Movie recommendation system in Python (pandas, cosine similarity). Internship: 2 months backend intern at a startup, built REST endpoints and wrote SQL reports. Skills: Python, JavaScript, SQL, Git.",
  "notes": "END-TO-END TEST RUN of the platform: keep it short. Use exactly 4 rounds in this order: aptitude MCQ (one section, 5 questions, 5 min), group discussion (conclude after 2 candidate contributions), coding (one easy problem), HR (2 questions only)."
};

export const deloitteBlueprint: CompanyBlueprint = {
  "company": "Deloitte USI",
  "role": "Analyst - Software Engineering",
  "level": "fresher (campus 2026)",
  "summary": "Deloitte USI campus hiring usually starts with an online assessment: English, reasoning, quant, computer fundamentals and 2 coding questions in about 90 minutes. Some drives add a Versant spoken-English test and a group discussion. After that come a technical interview (DSA, SQL, OOP, projects) and an HR interview. This mock is a shortened end-to-end test run with 4 rounds: aptitude MCQ (5 questions), group discussion, one easy coding problem, and HR (2 questions).",
  "rounds": [
    {
      "id": "r1-aptitude",
      "order": 1,
      "type": "aptitude_mcq",
      "name": "Online Assessment - Aptitude",
      "duration_min": 5,
      "focus": [
        "quantitative aptitude",
        "logical reasoning",
        "verbal ability",
        "computer fundamentals"
      ],
      "difficulty": "easy",
      "confidence": "high",
      "question_budget": 5,
      "sources": [
        {
          "url": "https://faceprep.in/article/deloitte-recruitment-process-for-freshers-in-detail-face-prep/",
          "title": "FACE Prep - Deloitte recruitment process for freshers",
          "date": "2026-05"
        },
        {
          "url": "https://www.geeksforgeeks.org/interview-experiences/deloitte-usi-interview-experience-for-analyst-on-campus-2024/",
          "title": "GfG - Deloitte USI Analyst on-campus 2024",
          "date": "2024"
        },
        {
          "url": "https://cpt.hitbullseye.com/Deloitte-Test-Pattern.php",
          "title": "Hitbullseye - Deloitte test pattern",
          "date": null
        }
      ],
      "notes": "Scaled down from the real ~90 min, ~67-question OA (English, reasoning, quant, CS fundamentals) to one 5-question, 5-minute section, per the test-run instructions. The OA's coding part is covered separately in round 3. The Versant spoken-English test is not simulated."
    },
    {
      "id": "r2-gd",
      "order": 2,
      "type": "group_discussion",
      "name": "Group Discussion",
      "duration_min": 10,
      "focus": [
        "initiation",
        "content and facts",
        "listening",
        "summarizing",
        "communication"
      ],
      "difficulty": "medium",
      "confidence": "low",
      "question_budget": 2,
      "sources": [
        {
          "url": "https://www.geeksforgeeks.org/?p=500913",
          "title": "GfG - Deloitte USI technical profile experience with GD (2020)",
          "date": "2020"
        },
        {
          "url": "https://faceprep.in/article/deloitte-recruitment-process-for-freshers-in-detail-face-prep/",
          "title": "FACE Prep - says GD/JAM no longer part of process",
          "date": "2026-05"
        }
      ],
      "notes": "GD appears only in some drives. Shortened: the discussion concludes after 2 candidate contributions, followed by the candidate's summary."
    },
    {
      "id": "r3-coding",
      "order": 3,
      "type": "coding",
      "name": "Coding (OA coding / technical)",
      "duration_min": 20,
      "focus": [
        "strings",
        "arrays",
        "hash maps",
        "complexity"
      ],
      "difficulty": "easy",
      "confidence": "medium",
      "question_budget": 1,
      "sources": [
        {
          "url": "https://www.geeksforgeeks.org/interview-experiences/deloitte-usi-interview-experience-for-analyst-on-campus-2024/",
          "title": "GfG - Deloitte USI Analyst on-campus 2024",
          "date": "2024"
        },
        {
          "url": "https://www.geeksforgeeks.org/interview-experiences/deloitte-interview-experience-for-fte-on-campus-2024/",
          "title": "GfG - Deloitte FTE on-campus 2024",
          "date": "2024"
        }
      ],
      "notes": "One easy string or array problem in the style of the OA coding section and the technical round, followed by 1-2 follow-up questions on complexity and edge cases. The full technical interview (SQL, OOP, projects) is skipped in this test run."
    },
    {
      "id": "r4-hr",
      "order": 4,
      "type": "hr",
      "name": "HR Interview",
      "duration_min": 8,
      "focus": [
        "motivation for Deloitte",
        "internship learnings",
        "career goals",
        "flexibility"
      ],
      "difficulty": "easy",
      "confidence": "medium",
      "question_budget": 2,
      "sources": [
        {
          "url": "https://jobrise.io/en/blog/deloitte-interview-questions-freshers-2026/",
          "title": "Jobrise - Deloitte interview questions for freshers 2026",
          "date": "2026-02"
        },
        {
          "url": "https://www.geeksforgeeks.org/interview-experiences/deloitte-interview-experience-for-fte-on-campus-2024/",
          "title": "GfG - Deloitte FTE on-campus 2024",
          "date": "2024"
        }
      ],
      "notes": "Limited to 2 main questions for the test run. In real drives HR is sometimes merged with the technical interview (15-25 min combined)."
    }
  ],
  "focus_areas": [
    "Quant, reasoning and verbal aptitude speed",
    "Group discussion communication and structure",
    "Easy string and array coding with complexity analysis",
    "SQL queries and DBMS fundamentals",
    "OOP concepts with concrete examples (not evidenced on the resume)",
    "Deep dive on the expense tracker project (JWT, schema, FastAPI) and the internship",
    "Why Deloitte, career goals, flexibility"
  ],
  "question_bank": [
    {
      "question": "Quant: time-speed-distance (trains), ages, simple and compound interest, probability, number systems",
      "round_type": "aptitude_mcq",
      "source_url": "https://cpt.hitbullseye.com/Deloitte-Test-Pattern.php"
    },
    {
      "question": "Analytical, quantitative and verbal MCQs plus CS fundamentals (OS, DBMS, SQL, pseudocode)",
      "round_type": "aptitude_mcq",
      "source_url": "https://www.geeksforgeeks.org/interview-experiences/deloitte-usi-interview-experience-for-analyst-on-campus-2024/"
    },
    {
      "question": "How to tackle financial crimes with technology",
      "round_type": "group_discussion",
      "source_url": "https://www.geeksforgeeks.org/?p=500913"
    },
    {
      "question": "Find the first non-repeating character in a string",
      "round_type": "coding",
      "source_url": "https://www.geeksforgeeks.org/interview-experiences/deloitte-interview-experience-for-fte-on-campus-2024/"
    },
    {
      "question": "Can the array be split into pairs where every pair has an even sum? (YES/NO)",
      "round_type": "coding",
      "source_url": "https://www.geeksforgeeks.org/interview-experiences/deloitte-interview-experience-for-fte-on-campus-2024/"
    },
    {
      "question": "Minimum character removals to make a string not a palindrome",
      "round_type": "coding",
      "source_url": "https://www.geeksforgeeks.org/interview-experiences/deloitte-interview-experience-for-fte-on-campus-2024/"
    },
    {
      "question": "Next greater element for each array element",
      "round_type": "coding",
      "source_url": "https://www.geeksforgeeks.org/interview-experiences/deloitte-interview-experience-for-fte-on-campus-2024/"
    },
    {
      "question": "Delete the middle node of a linked list",
      "round_type": "technical",
      "source_url": "https://www.geeksforgeeks.org/interview-experiences/deloitte-interview-experience-for-fte-on-campus-2024/"
    },
    {
      "question": "Design an e-commerce database and write SQL queries on it",
      "round_type": "technical",
      "source_url": "https://www.geeksforgeeks.org/interview-experiences/deloitte-interview-experience-for-fte-on-campus-2024/"
    },
    {
      "question": "Explain the implementation details of your resume projects",
      "round_type": "technical",
      "source_url": "https://www.geeksforgeeks.org/interview-experiences/deloitte-usi-interview-experience-for-analyst-on-campus-2024/"
    },
    {
      "question": "Suggest improvements to an autonomous parking system",
      "round_type": "technical",
      "source_url": "https://www.geeksforgeeks.org/interview-experiences/deloitte-usi-interview-experience-for-analyst-on-campus-2024/"
    },
    {
      "question": "How does JWT authentication work in your expense tracker, and how would you handle token expiry or revocation?",
      "round_type": "technical",
      "source_url": null
    },
    {
      "question": "What did you learn from your internship?",
      "round_type": "hr",
      "source_url": "https://www.geeksforgeeks.org/interview-experiences/deloitte-interview-experience-for-fte-on-campus-2024/"
    },
    {
      "question": "Would you leave Deloitte if you got a better offer?",
      "round_type": "hr",
      "source_url": "https://www.geeksforgeeks.org/interview-experiences/deloitte-interview-experience-for-fte-on-campus-2024/"
    },
    {
      "question": "Why Deloitte? Where do you see yourself in 3-5 years?",
      "round_type": "hr",
      "source_url": "https://jobrise.io/en/blog/deloitte-interview-questions-freshers-2026/"
    }
  ],
  "conflicts": [
    "OA length: FACE Prep says 67 questions in 90 minutes, another FACE Prep page says 75 in 95 minutes, PapersAdda estimates 40-60 MCQs in 45-75 minutes, and a LeetCode report says 45 MCQs in 60 minutes with no coding.",
    "Group discussion: a Nov 2025 Bengaluru candidate report includes a GD, but FACE Prep (May 2026) says GD/JAM rounds were dropped.",
    "Technical and HR: combined into one 15-25 minute interview (FACE Prep) vs separate 30-50 and 20-30 minute rounds (Jobrise).",
    "Versant spoken-English test: reported as 15-20 minutes by one source and about 20 minutes with 40-45 questions by another. Its placement (inside or after the OA) also varies."
  ]
};

export const deloitteTranscript: TranscriptEntry[] = [
  {
    "role": "interviewer",
    "speaker": "Interviewer",
    "text": "Welcome to your Deloitte USI campus mock interview for the Analyst, Software Engineering role. This is a short test run. We'll go through a five-question aptitude section, a short group discussion, one easy coding problem, and a quick HR conversation.",
    "round_id": null,
    "at": "2026-10-22T09:12:21+00:00"
  },
  {
    "role": "interviewer",
    "speaker": "Ananya Iyer, Campus Recruitment Lead",
    "text": "Let's begin with the online assessment. You have five minutes for five questions covering quantitative aptitude, reasoning, verbal ability and computer fundamentals. There's no negative marking. Your time starts now.",
    "round_id": "r1-aptitude",
    "at": "2026-10-22T09:16:10+00:00"
  },
  {
    "role": "candidate",
    "speaker": "You",
    "text": "Online Assessment - General Aptitude and Fundamentals: 4/5 correct, 0 unanswered",
    "round_id": "r1-aptitude",
    "at": "2026-10-22T09:16:37+00:00"
  },
  {
    "role": "interviewer",
    "speaker": "Ananya Iyer, Campus Recruitment Lead",
    "text": "Thank you, that completes the online assessment section. Take a moment to review your feedback, and then we'll move on to the group discussion.",
    "round_id": "r1-aptitude",
    "at": "2026-10-22T09:16:50+00:00"
  },
  {
    "role": "system",
    "speaker": "Score",
    "text": "Online Assessment - Aptitude: 80/100 (hire)",
    "round_id": "r1-aptitude",
    "at": "2026-10-22T09:16:50+00:00"
  },
  {
    "role": "interviewer",
    "speaker": "Vikram Desai, Senior Consultant (GD Moderator)",
    "text": "Welcome to the group discussion. The topic is: Technology is the most effective weapon against financial crimes. You'll be discussing with Rohan, Sneha and Arjun. Please be respectful, don't interrupt, and back your points with examples. Rohan has started us off and Sneha has responded. Feel free to jump in whenever you're ready.",
    "round_id": "r2-gd",
    "at": "2026-10-22T09:17:22+00:00"
  },
  {
    "role": "panelist",
    "speaker": "Rohan Mehta",
    "text": "Technology is the most effective weapon we have, and India is already proving it. UPI fraud monitoring and AI-based anomaly detection catch suspicious transactions in seconds, something no manual team could ever do. Blockchain audit trails can make every rupee traceable, so I genuinely believe tech should lead this fight.",
    "round_id": "r2-gd",
    "at": "2026-10-22T09:17:22+00:00"
  },
  {
    "role": "panelist",
    "speaker": "Sneha Kulkarni",
    "text": "Rohan, I'd push back a little. Those systems throw up huge numbers of false positives, so honest customers get their accounts frozen while real launderers slip through. Criminals also adapt faster than models get retrained. Tech is necessary, but without good regulation and skilled investigators, it isn't the most effective weapon on its own.",
    "round_id": "r2-gd",
    "at": "2026-10-22T09:17:22+00:00"
  },
  {
    "role": "candidate",
    "speaker": "You",
    "text": "I agree with both of you partly. Rohan is right that AI detection scales, like UPI fraud checks, but Sneha's point on false positives matters. I think technology is the most effective weapon only when it is combined with human investigators who review flagged cases and with regulation like KYC norms. Sneha, would you agree tech plus human review beats either alone?",
    "round_id": "r2-gd",
    "at": "2026-10-22T09:17:42+00:00"
  },
  {
    "role": "panelist",
    "speaker": "Sneha Kulkarni",
    "text": "Mostly yes, but I'd add a caveat. Human review doesn't scale when a bank flags millions of transactions, so reviewers get tired and miss things. And in social engineering scams the victim presses approve themselves, so no model sees a fraud signal at all. That's where awareness and tighter rules matter.",
    "round_id": "r2-gd",
    "at": "2026-10-22T09:18:06+00:00"
  },
  {
    "role": "panelist",
    "speaker": "Arjun Reddy",
    "text": "Sneha's point about victims approving payments is exactly where I'd bring in the people side. If banks, telecom firms and payment apps shared fraud data in near real time, and we had a strong public awareness push, we could catch mule accounts before the money moves. But is inter-bank data sharing worth the privacy trade-off, or does it create new risks?",
    "round_id": "r2-gd",
    "at": "2026-10-22T09:18:06+00:00"
  },
  {
    "role": "candidate",
    "speaker": "You",
    "text": "Arjun, data sharing is worth it if it is done through a regulated channel, like RBI-supervised fraud registries, with only transaction signals shared and not full customer data. So to summarise our discussion: technology is the most effective first line of defence because of scale and speed, but it works best combined with human review for flagged cases, awareness campaigns against social engineering, and privacy-safe data sharing between banks.",
    "round_id": "r2-gd",
    "at": "2026-10-22T09:18:26+00:00"
  },
  {
    "role": "interviewer",
    "speaker": "Vikram Desai, Senior Consultant (GD Moderator)",
    "text": "Thank you all, we'll stop the discussion here. You started summarising already. Please give us your final summary of the group's discussion in about thirty seconds, covering the main points each participant raised and where the group ended up.",
    "round_id": "r2-gd",
    "at": "2026-10-22T09:18:35+00:00"
  },
  {
    "role": "candidate",
    "speaker": "You",
    "text": "To summarise: Rohan argued technology leads because AI and UPI monitoring catch fraud at scale and speed. Sneha raised false positives and criminals adapting, and that social engineering scams bypass models. Arjun added inter-bank data sharing and public awareness, with a privacy question. The group concluded that technology is the most effective first line of defence, but only together with human review, awareness and regulated, privacy-safe data sharing.",
    "round_id": "r2-gd",
    "at": "2026-10-22T09:19:27+00:00"
  },
  {
    "role": "interviewer",
    "speaker": "Vikram Desai, Senior Consultant (GD Moderator)",
    "text": "Thank you, that concludes the group discussion. Please review your feedback, and when you're ready we'll move on to the coding round.",
    "round_id": "r2-gd",
    "at": "2026-10-22T09:19:46+00:00"
  },
  {
    "role": "system",
    "speaker": "Score",
    "text": "Group Discussion: 78/100 (hire)",
    "round_id": "r2-gd",
    "at": "2026-10-22T09:19:46+00:00"
  },
  {
    "role": "interviewer",
    "speaker": "Karthik Subramanian, Consultant - Software Engineering",
    "text": "Welcome to the coding round. I'm Karthik. This problem has come up in Deloitte's technical rounds before. Read the statement carefully. You can use Python or JavaScript, and you have twenty minutes. Talk me through your approach if you'd like, then submit when you're ready.",
    "round_id": "r3-coding",
    "at": "2026-10-22T09:20:14+00:00"
  },
  {
    "role": "candidate",
    "speaker": "You",
    "text": "Submitted python solution: examples 3/3, hidden tests 9/9",
    "round_id": "r3-coding",
    "at": "2026-10-22T09:21:31+00:00"
  },
  {
    "role": "interviewer",
    "speaker": "Karthik Subramanian, Consultant - Software Engineering",
    "text": "Okay, all tests pass. A follow-up: suppose the characters arrive as a continuous stream, one at a time, and after each one I want the first non-repeating character seen so far. You can't rescan the whole string every time. How would you change your approach, and what would the time per character be?",
    "round_id": "r3-coding",
    "at": "2026-10-22T09:21:39+00:00"
  },
  {
    "role": "candidate",
    "speaker": "You",
    "text": "For a stream I would keep a count array of size 26 plus a queue of candidate characters. When a character arrives, I increment its count and push it to the queue if it is new. Then I pop from the front of the queue while the front character's count is more than 1. The front of the queue is the answer, or -1 if empty. Each character is pushed and popped at most once, so it is amortised O(1) per character and O(26) space. Another option is a doubly linked list with a hash map for O(1) removal.",
    "round_id": "r3-coding",
    "at": "2026-10-22T09:21:52+00:00"
  },
  {
    "role": "interviewer",
    "speaker": "Karthik Subramanian, Consultant - Software Engineering",
    "text": "Good, that's all for the coding round. Please take a look at your feedback, and then we'll finish with a short HR conversation.",
    "round_id": "r3-coding",
    "at": "2026-10-22T09:22:07+00:00"
  },
  {
    "role": "system",
    "speaker": "Score",
    "text": "Coding (OA coding / technical): 91/100 (strong_hire)",
    "round_id": "r3-coding",
    "at": "2026-10-22T09:22:07+00:00"
  },
  {
    "role": "interviewer",
    "speaker": "Meera Joshi, HR Manager - Campus Talent",
    "text": "Hi, I'm Meera from the HR team. Congratulations on getting through the earlier rounds. Let's keep this conversational. To start: why do you want to join Deloitte USI as an Analyst in software engineering, rather than a product company or a startup like the one you interned at?",
    "round_id": "r4-hr",
    "at": "2026-10-22T09:22:29+00:00"
  },
  {
    "role": "candidate",
    "speaker": "You",
    "text": "At my startup internship I built REST endpoints and SQL reports, and I enjoyed seeing them used by business teams. Deloitte USI lets me do that at a much larger scale, across many clients and industries, so in the first two years I would learn more domains than I could at one product company. I also like the structured training and mentorship Deloitte gives freshers, and the mix of engineering with client problem solving matches my strengths in both coding and communication.",
    "round_id": "r4-hr",
    "at": "2026-10-22T09:22:45+00:00"
  },
  {
    "role": "interviewer",
    "speaker": "Meera Joshi, HR Manager - Campus Talent",
    "text": "Okay. Here's my second and last question. Suppose six months after joining, another company offers you thirty percent more. Would you leave Deloitte? And where do you honestly see yourself in three to five years?",
    "round_id": "r4-hr",
    "at": "2026-10-22T09:22:52+00:00"
  },
  {
    "role": "candidate",
    "speaker": "You",
    "text": "No, I would not leave just for money after six months, because the first one or two years are about learning and I would lose the training and project exposure. In three to five years I see myself as a senior consultant who leads a small module of a client project and has deep skills in backend and cloud.",
    "round_id": "r4-hr",
    "at": "2026-10-22T09:23:08+00:00"
  },
  {
    "role": "interviewer",
    "speaker": "Meera Joshi, HR Manager - Campus Talent",
    "text": "Thank you, that's all from my side. It was nice talking to you. Please review your feedback, and then we'll share your overall report.",
    "round_id": "r4-hr",
    "at": "2026-10-22T09:23:27+00:00"
  },
  {
    "role": "system",
    "speaker": "Score",
    "text": "HR Interview: 77/100 (hire)",
    "round_id": "r4-hr",
    "at": "2026-10-22T09:23:27+00:00"
  },
  {
    "role": "interviewer",
    "speaker": "Interviewer",
    "text": "That completes your Deloitte USI mock interview. Overall you did well: strong coding, good listening and summarising in the group discussion, and clear HR answers. Your report shows what to work on next, mainly checking your aptitude answers, company-specific knowledge, and the technical interview topics we didn't cover today. Good luck with your preparation.",
    "round_id": null,
    "at": "2026-10-22T09:24:15+00:00"
  }
];

export const deloitteRoundScores: RoundScore[] = [
  {
    "round_id": "r1-aptitude",
    "round_name": "Online Assessment - Aptitude",
    "score": 80,
    "verdict": "hire",
    "rubric": [
      {
        "criterion": "Accuracy",
        "weight": 0.75,
        "score": 8,
        "comment": "4 of 5 correct. The train, CI-SI, synonym and SQL HAVING questions were right. The number series 2, 6, 12, 20, 30 was wrong: you chose 40 instead of 42."
      },
      {
        "criterion": "Time management",
        "weight": 0.25,
        "score": 8,
        "comment": "You finished in 26 seconds of the 5 minutes, which is very fast. The only miss was on a quick pattern question, so the speed probably cost a mark. In the real OA (about 67 questions in 90 minutes) you can spend a few seconds checking series answers."
      }
    ],
    "strengths": [
      "Fast and accurate on formula-based quant: relative speed with platform length, and the CI-SI shortcut P(r/100)^2",
      "Solid SQL fundamentals: knew that HAVING filters after GROUP BY",
      "Good vocabulary on the synonym question"
    ],
    "gaps": [
      "Number series: chose 40 for 2, 6, 12, 20, 30. The differences grow 4, 6, 8, 10, 12, so the answer is 42 (the n(n+1) pattern).",
      "Rushed: 26 seconds total suggests you didn't verify answers even though plenty of time was left"
    ],
    "model_answer": "Q1: 54 km/h = 15 m/s, distance 450 m, so 30 s. Q2: CI-SI for 2 years = P(r/100)^2 = Rs 100. Q3: the differences 4, 6, 8, 10 rise by 2, so the next is 30 + 12 = 42; check it against n(n+1). Q4: Meticulous = Thorough. Q5: HAVING filters aggregated groups and WHERE filters rows. A strong candidate solves each in 20-40 seconds and spends the spare time re-checking pattern questions."
  },
  {
    "round_id": "r2-gd",
    "round_name": "Group Discussion",
    "score": 78,
    "verdict": "hire",
    "rubric": [
      {
        "criterion": "Initiation and contribution",
        "weight": 0.25,
        "score": 7,
        "comment": "You didn't open the discussion (Rohan and Sneha spoke first), but your first entry was quick and set the group's direction: 'tech is most effective only when combined with human investigators... and regulation like KYC norms.' You made two substantive contributions, which is fine for this length, but with 7-8 people in a real GD you'd need to get in more often."
      },
      {
        "criterion": "Content quality and facts",
        "weight": 0.3,
        "score": 7,
        "comment": "Relevant, concrete points: KYC norms, RBI-supervised fraud registries, and sharing only transaction signals instead of full customer data. You gave no numbers or real-world examples, such as the volume of UPI fraud cases, the RBI's MuleHunter.AI initiative, or the DPDP Act on privacy, and you never addressed Sneha's point that human review doesn't scale."
      },
      {
        "criterion": "Listening and building on others",
        "weight": 0.2,
        "score": 9,
        "comment": "A clear strength. You acknowledged both Rohan and Sneha by name, connected their points, put a direct question to Sneha, and answered Arjun's privacy question directly."
      },
      {
        "criterion": "Leadership and summarizing",
        "weight": 0.15,
        "score": 9,
        "comment": "Strong, balanced summary that credited each participant's position accurately (Rohan on scale, Sneha on false positives and social engineering, Arjun on data sharing and privacy) and stated a clear group conclusion. You also volunteered an early summary before the moderator asked, which shows you were steering the group."
      },
      {
        "criterion": "Communication",
        "weight": 0.1,
        "score": 8,
        "comment": "Concise, structured and polite. Each turn had one clear idea. To sound more confident, you could make your own stance stronger rather than opening with 'I agree with both of you partly.'"
      }
    ],
    "strengths": [
      "Excellent listening: addressed people by name and built on their points instead of repeating them",
      "Moved the group toward consensus with the 'tech plus human review plus regulation' framing",
      "Answered the privacy trade-off with a specific mechanism: a regulated registry sharing signals only",
      "Accurate, well-attributed final summary"
    ],
    "gaps": [
      "Didn't initiate. In a real Deloitte GD, opening with a framework earns early visibility.",
      "No data or named examples to back your claims",
      "Didn't tackle Sneha's counterpoint that human review doesn't scale (you could have proposed risk-based triage so humans only see high-risk flags)",
      "Only two contributions. A larger group needs 3-4 short, well-timed entries."
    ],
    "model_answer": "A strong candidate opens with a frame: 'Let's look at this on three levels: detection, prevention and enforcement.' They then argue that tech dominates detection, citing AI-based anomaly detection on UPI's billions of monthly transactions and RBI's MuleHunter.AI for mule accounts. Prevention needs awareness, because authorised-push-payment scams bypass models. Enforcement needs regulation and investigators. To answer the scale objection, they propose risk-scored triage so human reviewers only handle the top-risk flags. On privacy, they suggest DPDP-compliant, regulator-run fraud registries that share hashed signals only. They close with a summary that attributes each view and gives a clear verdict: technology is the most effective weapon, but not a sufficient one."
  },
  {
    "round_id": "r3-coding",
    "round_name": "Coding (OA coding / technical)",
    "score": 91,
    "verdict": "strong_hire",
    "rubric": [
      {
        "criterion": "Correctness of answers",
        "weight": 0.4,
        "score": 10,
        "comment": "Clean two-pass solution: count with a dict, then scan in original order. It passed 3/3 examples and 9/9 hidden tests, including the single-character, all-repeating and last-position cases."
      },
      {
        "criterion": "Depth and reasoning",
        "weight": 0.3,
        "score": 9,
        "comment": "You stated O(n) time and O(1) space and justified it correctly ('at most 26 lowercase letters'). On the streaming follow-up you designed the count array plus queue with lazy popping, argued amortised O(1) correctly ('each character is pushed and popped at most once'), and offered the doubly linked list plus hash map alternative unprompted. That's very good depth for an easy problem."
      },
      {
        "criterion": "Communication clarity",
        "weight": 0.3,
        "score": 8,
        "comment": "Your explanations were concise and precise. You didn't mention edge cases or tests you'd run yourself (single character, all repeating, the answer being the last character) before submitting, and in a live round interviewers expect you to talk through those."
      }
    ],
    "strengths": [
      "Correct, idiomatic O(n) solution on the first submission",
      "Accurate complexity analysis, including why the space is O(1)",
      "Strong streaming extension with a correct amortised-cost argument and an alternative design"
    ],
    "gaps": [
      "Didn't call out edge cases or dry-run an example before submitting",
      "This was an easy problem, so the real Deloitte OA's medium string question (for example, the smallest window containing all characters of another string) still needs practice"
    ],
    "model_answer": "Count the frequency of each character in an array of size 26 (or a dict), then scan S left to right and print the first character with count 1, otherwise -1. That's O(n) time and O(1) extra space because the alphabet is fixed. Before submitting, dry-run 'swiss' to get w, and mention the single character 'a', 'aabb' giving -1, and the answer at the last index. For a stream, keep counts plus a queue, push each new character, pop the front while its count is above 1, and report the front or -1. That's amortised O(1) per character. Alternatively, use an OrderedDict or a doubly linked list with a hash map for O(1) deletions."
  },
  {
    "round_id": "r4-hr",
    "round_name": "HR Interview",
    "score": 77,
    "verdict": "hire",
    "rubric": [
      {
        "criterion": "Motivation and company knowledge",
        "weight": 0.3,
        "score": 7,
        "comment": "Good personal link to your internship ('I enjoyed seeing them used by business teams'), and a sensible argument about exposure to many clients and domains. But the answer could fit any consulting firm. You named nothing specific to Deloitte USI: no service lines like Consulting, Tax, Audit & Assurance or Risk & Financial Advisory, no technology practices such as Cloud Engineering or AI & Data, and no programs, values or recent initiatives."
      },
      {
        "criterion": "Clarity and confidence",
        "weight": 0.3,
        "score": 8,
        "comment": "Both answers were direct and well organised. You gave a clear 'No' on the offer question with a reason, and a concrete 3-5 year goal ('lead a small module of a client project... backend and cloud')."
      },
      {
        "criterion": "Honesty and consistency",
        "weight": 0.2,
        "score": 8,
        "comment": "Consistent learning-first theme across both answers, and it matches your internship and resume. 'Senior consultant in 3-5 years' fits Deloitte's actual Analyst → Consultant → Senior Consultant path, so it sounds informed rather than inflated. The flat 'I would not leave just for money' sounded a little rehearsed. Acknowledging that pay matters but growth matters more would sound more genuine."
      },
      {
        "criterion": "Professionalism",
        "weight": 0.2,
        "score": 8,
        "comment": "Positive and respectful throughout, with no negative remarks about the startup or other companies, and suitably brief answers."
      }
    ],
    "strengths": [
      "Tied your motivation to real internship experience instead of generic praise",
      "Clear, decisive answer to the loyalty question, with reasoning about learning and training",
      "Realistic career goal that matches Deloitte's level structure and your backend and cloud interests"
    ],
    "gaps": [
      "No Deloitte USI-specific knowledge: offices, service lines, technology practices, culture or values",
      "The answer to 'why Deloitte over a product company' was a bit generic. Mention client diversity, plus a specific practice you want to join and why.",
      "The 3-5 year goal lacked a concrete plan, such as a cloud certification (AWS, Azure) in year one or owning a module by year two"
    ],
    "model_answer": "Q1: 'In my internship I built REST endpoints and SQL reports that business teams used daily, and I enjoyed turning their requirements into working software. Deloitte USI lets me do that across many clients and industries. I'm particularly interested in the engineering and cloud work in Deloitte's Consulting practice, and the structured onboarding and mentorship for analysts would help me ramp up quickly. Deloitte's focus on client service and continuous learning also matches how I work.' Q2: 'Compensation matters, but at six months my priority is learning and building credibility on real client work, so I wouldn't move just for 30% more. In 3-5 years I want to be a Senior Consultant who owns a backend or cloud module end to end, holds a cloud certification, and mentors new analysts.'"
  }
];

export const deloitteReport: FinalReport = {
  "overall_score": 82,
  "verdict": "hire",
  "summary": "Shortened 4-round test run of the Deloitte USI campus process for Analyst - Software Engineering. Overall score 82, weighted coding 30%, aptitude 25%, HR 25%, GD 20%. Coding was your strongest round (91): a correct O(n) solution on the first submission plus an excellent streaming follow-up. The GD (78) showed very good listening and a well-attributed summary, but you didn't open the discussion and gave no data. Aptitude (80) was fast and mostly accurate, but you rushed past a number series question. HR (77) was clear and consistent but generic about Deloitte. Caveat: the real process includes a much longer OA (about 67 questions plus 2 coding problems), sometimes a Versant English test, and a technical interview on SQL, OOP, DBMS and your projects. None of those were tested here, and the JD analysis flags OOP and DSA depth as unproven on your resume. Treat this score as provisional until those areas are practised.",
  "round_scores": [
    {
      "round_id": "r1-aptitude",
      "round_name": "Online Assessment - Aptitude",
      "score": 80,
      "verdict": "hire",
      "rubric": [
        {
          "criterion": "Accuracy",
          "weight": 0.75,
          "score": 8,
          "comment": "4 of 5 correct. The train, CI-SI, synonym and SQL HAVING questions were right. The number series 2, 6, 12, 20, 30 was wrong: you chose 40 instead of 42."
        },
        {
          "criterion": "Time management",
          "weight": 0.25,
          "score": 8,
          "comment": "You finished in 26 seconds of the 5 minutes, which is very fast. The only miss was on a quick pattern question, so the speed probably cost a mark."
        }
      ],
      "strengths": [
        "Fast and accurate on formula-based quant",
        "Solid SQL fundamentals (HAVING vs WHERE)",
        "Good vocabulary"
      ],
      "gaps": [
        "Number series error: the differences grow by 2, so the answer was 42",
        "Didn't use the spare time to verify answers"
      ],
      "model_answer": "30 s; Rs 100; 42 (n(n+1)); Thorough; HAVING. Spend the spare time re-checking pattern questions."
    },
    {
      "round_id": "r2-gd",
      "round_name": "Group Discussion",
      "score": 78,
      "verdict": "hire",
      "rubric": [
        {
          "criterion": "Initiation and contribution",
          "weight": 0.25,
          "score": 7,
          "comment": "You didn't open, but your first entry quickly set the group's direction. Two substantive contributions."
        },
        {
          "criterion": "Content quality and facts",
          "weight": 0.3,
          "score": 7,
          "comment": "Relevant points (KYC, RBI-supervised registries, sharing signals only), but no data and no answer to Sneha's point that human review doesn't scale."
        },
        {
          "criterion": "Listening and building on others",
          "weight": 0.2,
          "score": 9,
          "comment": "Addressed people by name, connected their points and answered Arjun's question directly."
        },
        {
          "criterion": "Leadership and summarizing",
          "weight": 0.15,
          "score": 9,
          "comment": "Accurate, well-attributed summary with a clear group conclusion."
        },
        {
          "criterion": "Communication",
          "weight": 0.1,
          "score": 8,
          "comment": "Concise and polite. You could state your own stance more strongly."
        }
      ],
      "strengths": [
        "Excellent listening and building on others",
        "Steered the group toward consensus",
        "Strong summary"
      ],
      "gaps": [
        "Didn't initiate",
        "No facts or figures",
        "Only two contributions"
      ],
      "model_answer": "Open with a detection-prevention-enforcement frame, cite UPI volumes and RBI's MuleHunter.AI, propose risk-scored triage to answer the scale objection, suggest DPDP-compliant signal sharing for privacy, and end with an attributed summary."
    },
    {
      "round_id": "r3-coding",
      "round_name": "Coding (OA coding / technical)",
      "score": 91,
      "verdict": "strong_hire",
      "rubric": [
        {
          "criterion": "Correctness of answers",
          "weight": 0.4,
          "score": 10,
          "comment": "Passed 3/3 examples and 9/9 hidden tests with a clean two-pass solution."
        },
        {
          "criterion": "Depth and reasoning",
          "weight": 0.3,
          "score": 9,
          "comment": "Correct O(n) / O(1) analysis. Streaming design with counts plus a queue, a correct amortised argument, and a linked-list alternative."
        },
        {
          "criterion": "Communication clarity",
          "weight": 0.3,
          "score": 8,
          "comment": "Concise and precise, but you didn't talk through edge cases or a dry run."
        }
      ],
      "strengths": [
        "Correct on the first submission",
        "Accurate complexity reasoning",
        "Strong follow-up design"
      ],
      "gaps": [
        "No edge-case walkthrough",
        "Only an easy problem was tested. The OA also has a medium string problem."
      ],
      "model_answer": "Count frequencies, scan in order and print the first character with count 1, else -1. O(n) time, O(1) space. For a stream, keep counts plus a queue with lazy popping, amortised O(1) per character."
    },
    {
      "round_id": "r4-hr",
      "round_name": "HR Interview",
      "score": 77,
      "verdict": "hire",
      "rubric": [
        {
          "criterion": "Motivation and company knowledge",
          "weight": 0.3,
          "score": 7,
          "comment": "Linked your motivation to the internship, but nothing specific to Deloitte USI."
        },
        {
          "criterion": "Clarity and confidence",
          "weight": 0.3,
          "score": 8,
          "comment": "Direct, well-organised answers."
        },
        {
          "criterion": "Honesty and consistency",
          "weight": 0.2,
          "score": 8,
          "comment": "Consistent learning-first theme and a realistic Senior Consultant goal. The 'not for money' line sounded slightly rehearsed."
        },
        {
          "criterion": "Professionalism",
          "weight": 0.2,
          "score": 8,
          "comment": "Positive and respectful throughout."
        }
      ],
      "strengths": [
        "Motivation grounded in experience",
        "Decisive answer to the loyalty question",
        "Realistic career path"
      ],
      "gaps": [
        "No Deloitte-specific knowledge",
        "No concrete growth plan"
      ],
      "model_answer": "Name a Deloitte practice you're targeting (for example cloud engineering in Consulting) and mention the analyst onboarding. Acknowledge pay but prioritise learning. Give a 3-5 year path with a certification, module ownership and mentoring."
    }
  ],
  "top_strengths": [
    "Strong coding fundamentals: correct O(n) solution and a well-reasoned streaming extension",
    "Excellent listening and summarising in the GD, building on others by name",
    "Clear, consistent communication across rounds",
    "Good grip on quant formulas and SQL basics"
  ],
  "top_gaps": [
    "Untested but likely probed in the real technical interview: OOP with concrete examples, SQL beyond the basics (joins, window functions, indexing), DBMS and OS fundamentals, and a project deep dive (JWT flow, schema design)",
    "Little Deloitte USI-specific knowledge in HR answers",
    "GD content lacks data and examples, and you didn't take the initiative to open",
    "Rushing aptitude questions without verifying (missed a simple number series)",
    "Medium-difficulty string and array problems not yet demonstrated (sliding window, stack-based)"
  ],
  "prep_plan_7d": [
    {
      "day": 1,
      "focus": "Aptitude speed with accuracy",
      "tasks": [
        "Take a timed 60-question mixed set (quant, reasoning, verbal) in 60 minutes",
        "Drill 30 number series and pattern questions, always checking first and second differences, squares, cubes and n(n+1)",
        "Practise 20 CS-fundamentals MCQs (OS, DBMS, SQL, pseudocode output prediction)"
      ]
    },
    {
      "day": 2,
      "focus": "Medium string and array coding",
      "tasks": [
        "Solve: smallest window containing all characters of another string (sliding window)",
        "Solve: next greater element (monotonic stack), and pairing an array into even-sum pairs",
        "For each problem, say the brute force aloud first, then the optimisation, then 3 edge cases before coding"
      ]
    },
    {
      "day": 3,
      "focus": "SQL and DBMS for the technical round",
      "tasks": [
        "Design an e-commerce schema (users, products, orders, order_items) and write 10 queries: joins, GROUP BY/HAVING, a subquery, a second-highest salary query, and window functions (RANK, ROW_NUMBER)",
        "Revise normalisation up to 3NF, ACID, indexes (when they help and when they hurt) and transaction isolation",
        "Prepare a 2-minute explanation of one SQL report from your internship: the tables, the query, and any performance tuning"
      ]
    },
    {
      "day": 4,
      "focus": "OOP and Python fundamentals",
      "tasks": [
        "Explain the 4 OOP pillars with Python code examples from your expense tracker (for example Expense, User and Category classes)",
        "Revise abstract class vs interface (ABC in Python), overloading vs overriding, and composition vs inheritance",
        "Answer Python questions aloud: list vs tuple vs dict vs set, mutability, decorators, generators, and the GIL at a basic level"
      ]
    },
    {
      "day": 5,
      "focus": "Project deep dive",
      "tasks": [
        "Draw the expense tracker architecture: React, then FastAPI, then PostgreSQL, plus the JWT login, refresh and expiry flow, token storage, and password hashing with bcrypt",
        "Prepare answers to: why FastAPI, how you'd scale to 100k users, how you tested it, and how you'd deploy it on a cloud",
        "Explain the recommender: TF-IDF or count vectors, cosine similarity, the cold-start limitation, and how you'd evaluate it"
      ]
    },
    {
      "day": 6,
      "focus": "GD and Deloitte company knowledge",
      "tasks": [
        "Do 2 timed GD drills on current topics (AI in jobs, UPI and digital fraud, DPDP Act privacy). Open each with a 3-part framework and include at least 2 facts or figures.",
        "Research Deloitte USI: offices, the main businesses (Consulting, Tax, Audit & Assurance, Risk & Financial Advisory), the technology practices, and the analyst career ladder",
        "Rewrite your 'Why Deloitte' answer to name a target practice and a specific reason"
      ]
    },
    {
      "day": 7,
      "focus": "Full mock and Versant practice",
      "tasks": [
        "Run a full mock: 45-minute OA with 2 coding questions, then a 30-minute technical mock on SQL, OOP and projects, then a 15-minute HR mock",
        "Do a 20-minute Versant-style practice: read aloud, repeat sentences, retell a story",
        "Prepare 3 STAR stories (internship challenge, a team conflict, a bug you fixed under pressure) with measurable outcomes"
      ]
    }
  ]
};

export const deloitteReportSpeech = "That completes your Deloitte USI mock interview. Overall you did well: strong coding, good listening and summarising in the group discussion, and clear HR answers. Your report shows what to work on next, mainly checking your aptitude answers, company-specific knowledge, and the technical interview topics we didn't cover today. Good luck with your preparation.";

export const amazonProfile: InterviewProfile = {
  "company": "Amazon",
  "role": "SDE 1",
  "experience": "fresher",
  "job_description": "Software Development Engineer I (new grad). Data structures and algorithms, object-oriented design, Java or Python, distributed systems basics. Amazon Leadership Principles.",
  "resume_text": "",
  "notes": ""
};

export const amazonBlueprint: CompanyBlueprint = {
  "company": "Amazon",
  "role": "SDE 1",
  "level": "Fresher / new grad",
  "summary": "Amazon SDE 1 new-grad hiring starts with an online assessment: 1-2 DSA problems in about 70-90 minutes, plus a work simulation and a Work Style survey, both scored against the Leadership Principles. A phone screen is sometimes reported. The final virtual loop is usually 3-5 interviews: 1-2 DSA coding rounds, an LP behavioral round, sometimes a low-level or light system design round, and a Bar Raiser who holds veto power. LPs are probed in every round. This mock scales the process to about 2.5 hours across 6 rounds. No resume was provided, so questions come from the JD and from reported Amazon questions.",
  "rounds": [
    {
      "id": "r1-oa-coding",
      "order": 1,
      "type": "coding",
      "name": "Online Assessment - Coding",
      "duration_min": 35,
      "focus": [
        "arrays and sliding window",
        "hash maps",
        "graph/grid BFS (delivery-route framing)",
        "intervals"
      ],
      "difficulty": "medium",
      "confidence": "medium",
      "question_budget": 1,
      "sources": [
        {
          "url": "https://simplify.jobs/blog/amazon-swe-interview-new-grads",
          "title": "Simplify - Amazon Software Engineer Interview Guide for New Grads 2027",
          "date": "2026-07"
        },
        {
          "url": "https://www.intervue.io/blog/amazon-interview-experience-india",
          "title": "Intervue - Amazon Interview Experience India",
          "date": "2026-10"
        },
        {
          "url": "https://devsunite.com/blog/my-amazon-sde-1-interview-experience-as-a-fresher-2026",
          "title": "My Amazon SDE 1 Interview Experience as a Fresher (2026)",
          "date": "2026"
        }
      ],
      "notes": "Scaled down. The real OA coding section is 70-90 min with 2 problems. Here it is one medium problem in 35 min, followed by 1-2 follow-up questions on complexity and edge cases. Problems use stdin/stdout, in Python or JavaScript."
    },
    {
      "id": "r2-work-sim",
      "order": 2,
      "type": "aptitude_mcq",
      "name": "Online Assessment - Work Simulation and Work Style",
      "duration_min": 12,
      "focus": [
        "situational judgement mapped to Leadership Principles",
        "prioritisation and escalation",
        "customer obsession vs. deadlines",
        "ownership of blockers"
      ],
      "difficulty": "medium",
      "confidence": "low",
      "question_budget": 6,
      "sources": [
        {
          "url": "https://prachub.com/resources/amazon-oa-work-simulation-guide-for-software-engineers",
          "title": "PracHub - Amazon OA Work Simulation Guide for Software Engineers",
          "date": "2026-08"
        },
        {
          "url": "https://devsunite.com/blog/my-amazon-sde-1-interview-experience-as-a-fresher-2026",
          "title": "My Amazon SDE 1 Interview Experience as a Fresher (2026)",
          "date": "2026"
        }
      ],
      "notes": "Mapped to aptitude_mcq. Amazon has no quant or verbal aptitude test for SDE 1. Its email-style work simulation and Work Style survey are scored against the LPs, so this round is one section of 10 scenario-based MCQs, each with an LP-aligned best answer. Real duration is unclear (sources range from 25 min to untimed), so it is scaled to 12 min."
    },
    {
      "id": "r3-loop-coding",
      "order": 3,
      "type": "coding",
      "name": "Loop Round 1 - Data Structures and Algorithms",
      "duration_min": 35,
      "focus": [
        "DP (House Robber variants)",
        "strings and two pointers",
        "heaps / merge k sorted",
        "trees and recursion",
        "dry-run and complexity analysis"
      ],
      "difficulty": "medium",
      "confidence": "medium",
      "question_budget": 2,
      "sources": [
        {
          "url": "https://devsunite.com/blog/my-amazon-sde-1-interview-experience-as-a-fresher-2026",
          "title": "My Amazon SDE 1 Interview Experience as a Fresher (2026)",
          "date": "2026"
        },
        {
          "url": "https://dglearning.substack.com/p/inside-the-amazon-2026-loop-rounds",
          "title": "Inside the Amazon 2026 Loop",
          "date": "2026-05"
        },
        {
          "url": "https://takeuforward.org/community/interview-experiences/amazon-sde-1-interview-experience-2026",
          "title": "Takeuforward - Amazon SDE-1 Interview Experience 2026",
          "date": "2026"
        }
      ],
      "notes": "Real loop coding rounds run 45-60 min, with one medium or medium-hard problem and a short LP warm-up. Scaled to 35 min with one problem and verbal follow-ups. Expect constraint-change questions."
    },
    {
      "id": "r4-lp-behavioral",
      "order": 4,
      "type": "behavioral",
      "name": "Loop Round 2 - Leadership Principles (Hiring Manager)",
      "duration_min": 25,
      "focus": [
        "Customer Obsession",
        "Ownership",
        "Bias for Action",
        "Dive Deep",
        "Earn Trust / disagreement",
        "Learn and Be Curious"
      ],
      "difficulty": "medium",
      "confidence": "high",
      "question_budget": 4,
      "sources": [
        {
          "url": "https://dglearning.substack.com/p/inside-the-amazon-2026-loop-rounds",
          "title": "Inside the Amazon 2026 Loop",
          "date": "2026-05"
        },
        {
          "url": "https://www.onsites.fyi/blog/article/amazon-sde-i-software-engineer-interview-questions",
          "title": "Onsites.fyi - Amazon SDE I Interview Questions",
          "date": null
        },
        {
          "url": "https://devsunite.com/blog/my-amazon-sde-1-interview-experience-as-a-fresher-2026",
          "title": "My Amazon SDE 1 Interview Experience as a Fresher (2026)",
          "date": "2026"
        }
      ],
      "notes": "Real round is 45-60 min with 4-6 STAR questions, each tagged to an LP. Scaled to 25 min with about 4 questions and heavy follow-ups. Also covers the project and database-schema discussion reported in a hiring-manager round."
    },
    {
      "id": "r5-ood-design",
      "order": 5,
      "type": "system_design",
      "name": "Loop Round 3 - Object-Oriented / Light System Design",
      "duration_min": 25,
      "focus": [
        "class design (parking lot, shopping cart with discounts)",
        "APIs and method signatures",
        "extensibility",
        "basic scaling: caching, what breaks at 10x"
      ],
      "difficulty": "medium",
      "confidence": "low",
      "question_budget": 3,
      "sources": [
        {
          "url": "https://www.onsites.fyi/blog/article/amazon-sde-i-software-engineer-interview-questions",
          "title": "Onsites.fyi - Amazon SDE I Interview Questions",
          "date": null
        },
        {
          "url": "https://prachub.com/resources/amazon-sde-1-interview-guide-2026-coding-system-design-leadership-principles-and-loop",
          "title": "PracHub - Amazon SDE 1 Interview Guide 2026",
          "date": "2026-09"
        },
        {
          "url": "https://simplify.jobs/blog/amazon-swe-interview-new-grads",
          "title": "Simplify - Amazon Software Engineer Interview Guide for New Grads 2027",
          "date": "2026-07"
        }
      ],
      "notes": "Run verbally with no whiteboard. Sources disagree on whether SDE 1 loops include a design round: one says 60-70% do, others say it happens sometimes or is replaced by LLD or machine coding in India. It is included because the JD lists OOD and distributed systems basics. The design is LLD-first, then 'what happens at 10x users'."
    },
    {
      "id": "r6-bar-raiser",
      "order": 6,
      "type": "behavioral",
      "name": "Loop Round 4 - Bar Raiser",
      "duration_min": 20,
      "focus": [
        "LP deep dives with 'why, and then what' probing",
        "failure and learning",
        "Insist on the Highest Standards",
        "Are Right, A Lot",
        "consistency across stories"
      ],
      "difficulty": "hard",
      "confidence": "medium",
      "question_budget": 4,
      "sources": [
        {
          "url": "https://dglearning.substack.com/p/inside-the-amazon-2026-loop-rounds",
          "title": "Inside the Amazon 2026 Loop",
          "date": "2026-05"
        },
        {
          "url": "https://www.intervue.io/blog/amazon-interview-experience-india",
          "title": "Intervue - Amazon Interview Experience India",
          "date": "2026-10"
        },
        {
          "url": "https://devsunite.com/blog/my-amazon-sde-1-interview-experience-as-a-fresher-2026",
          "title": "My Amazon SDE 1 Interview Experience as a Fresher (2026)",
          "date": "2026"
        }
      ],
      "notes": "Real Bar Raiser is about 60 min, comes from outside the hiring team, and holds veto power. Its format varies (LP-only, mixed technical, or design). Scaled to 20 min of 2-3 LP deep dives with relentless follow-ups. This round weighs heavily in the final report."
    }
  ],
  "focus_areas": [
    "Medium DSA: sliding window, hash maps, BFS/DFS on grids and graphs, DP, heaps",
    "Writing complete stdin/stdout programs and dry-running aloud",
    "Time and space complexity, edge cases, constraint changes",
    "6-8 STAR stories mapped to Leadership Principles, with measurable results",
    "Object-oriented design: class boundaries, extensibility, APIs",
    "Distributed systems basics: caching, scaling reads, failure handling",
    "Situational judgement in the work simulation (ownership, customer first, escalate wisely)"
  ],
  "question_bank": [
    {
      "question": "Sliding-window array problem (medium) in the OA",
      "round_type": "coding",
      "source_url": "https://devsunite.com/blog/my-amazon-sde-1-interview-experience-as-a-fresher-2026"
    },
    {
      "question": "Delivery-route shortest path graph traversal problem",
      "round_type": "coding",
      "source_url": "https://devsunite.com/blog/my-amazon-sde-1-interview-experience-as-a-fresher-2026"
    },
    {
      "question": "House Robber DP variant",
      "round_type": "coding",
      "source_url": "https://devsunite.com/blog/my-amazon-sde-1-interview-experience-as-a-fresher-2026"
    },
    {
      "question": "Longest substring without repeating characters",
      "round_type": "coding",
      "source_url": "https://devsunite.com/blog/my-amazon-sde-1-interview-experience-as-a-fresher-2026"
    },
    {
      "question": "Merge k sorted lists variant (Bar Raiser)",
      "round_type": "coding",
      "source_url": "https://devsunite.com/blog/my-amazon-sde-1-interview-experience-as-a-fresher-2026"
    },
    {
      "question": "Shortest path in a 0/1 matrix from top-left to bottom-right avoiding 1s",
      "round_type": "coding",
      "source_url": "https://www.onsites.fyi/blog/article/amazon-sde-i-software-engineer-interview-questions"
    },
    {
      "question": "Given meeting intervals, can a person attend all meetings?",
      "round_type": "coding",
      "source_url": "https://www.onsites.fyi/blog/article/amazon-sde-i-software-engineer-interview-questions"
    },
    {
      "question": "Serialize and deserialize a binary tree",
      "round_type": "coding",
      "source_url": "https://www.onsites.fyi/blog/article/amazon-sde-i-software-engineer-interview-questions"
    },
    {
      "question": "Decode ways; maximum product subarray; clone a graph",
      "round_type": "coding",
      "source_url": "https://www.onsites.fyi/blog/article/amazon-sde-i-software-engineer-interview-questions"
    },
    {
      "question": "Work simulation: manager asks for status while a teammate is blocking you. Escalate immediately or not?",
      "round_type": "aptitude_mcq",
      "source_url": "https://devsunite.com/blog/my-amazon-sde-1-interview-experience-as-a-fresher-2026"
    },
    {
      "question": "Tell me about a time you disagreed with a teammate.",
      "round_type": "behavioral",
      "source_url": "https://devsunite.com/blog/my-amazon-sde-1-interview-experience-as-a-fresher-2026"
    },
    {
      "question": "Tell me about a time you went out of your way to improve a customer's experience (Customer Obsession).",
      "round_type": "behavioral",
      "source_url": "https://www.onsites.fyi/blog/article/amazon-sde-i-software-engineer-interview-questions"
    },
    {
      "question": "Describe a time you made a quick decision with incomplete data (Bias for Action).",
      "round_type": "behavioral",
      "source_url": "https://www.onsites.fyi/blog/article/amazon-sde-i-software-engineer-interview-questions"
    },
    {
      "question": "Bar Raiser LP deep dive: 'and then what happened, what did you do, why that and not something else?'",
      "round_type": "behavioral",
      "source_url": "https://devsunite.com/blog/my-amazon-sde-1-interview-experience-as-a-fresher-2026"
    },
    {
      "question": "Walk me through your project and its database schema.",
      "round_type": "technical",
      "source_url": "https://devsunite.com/blog/my-amazon-sde-1-interview-experience-as-a-fresher-2026"
    },
    {
      "question": "How would this scale if 10x more users showed up? What would break first?",
      "round_type": "system_design",
      "source_url": "https://devsunite.com/blog/my-amazon-sde-1-interview-experience-as-a-fresher-2026"
    },
    {
      "question": "Design a parking lot system (floors, spot types, vehicles, payment, park/unpark APIs).",
      "round_type": "system_design",
      "source_url": "https://www.onsites.fyi/blog/article/amazon-sde-i-software-engineer-interview-questions"
    },
    {
      "question": "Design a rate limiter allowing 100 requests per minute per user.",
      "round_type": "system_design",
      "source_url": "https://www.onsites.fyi/blog/article/amazon-sde-i-software-engineer-interview-questions"
    },
    {
      "question": "Design an object-oriented shopping cart supporting percentage and fixed discounts.",
      "round_type": "system_design",
      "source_url": "https://prachub.com/resources/amazon-sde-1-interview-guide-2026-coding-system-design-leadership-principles-and-loop"
    },
    {
      "question": "Tell me about a time you failed and what you changed afterward.",
      "round_type": "behavioral",
      "source_url": null
    },
    {
      "question": "Tell me about a time you took ownership of something outside your responsibility.",
      "round_type": "behavioral",
      "source_url": null
    }
  ],
  "conflicts": [
    "Total OA length: about 60 min (official student page via PracHub), 70-90 min (Intervue India; 75 min in a 2025 India report), or 2-3.5 hours including all modules (Simplify).",
    "Work simulation duration: 25 min, 50 min, 90-120 min, or untimed, depending on source.",
    "Work Style survey length: 8, 10, 15, or 15-20 min.",
    "Phone screen: reported by two sources (45-60 min, 1 DSA problem plus LP) and absent from others. It is omitted from this mock.",
    "Final loop size: 3, 4-5, 5, or 4-6 interviews.",
    "Design round at SDE 1: one source says 60-70% of loops include one, another says only sometimes; India reports mention LLD or machine coding instead.",
    "Bar Raiser format: LP-only (Intervue), mixed technical/behavioral/design (2026 Substack guide), or HR-like (old 2020 Gurgaon report).",
    "OA-to-offer timeline: about 1 month, 4-8 weeks, or 3-4 months."
  ]
};

export const amazonTranscript: TranscriptEntry[] = [
  {
    "role": "interviewer",
    "speaker": "Interviewer",
    "text": "Welcome, and thanks for joining. This mock follows Amazon's SDE 1 new grad process. We'll start with an online assessment coding problem and a work simulation, then move to the interview loop: a live coding round, a Leadership Principles round, a light object-oriented design round, and a Bar Raiser round at the end. Take a look at the plan, and start when you're ready.",
    "round_id": null,
    "at": "2026-10-22T09:06:27+00:00"
  },
  {
    "role": "interviewer",
    "speaker": "Karthik Rao, SDE-2 (OA Proctor)",
    "text": "Hi, I'm Karthik, and I'll proctor your online assessment. You have one problem and thirty-five minutes. It's a delivery-routing problem on a warehouse grid. Read the input format carefully, because your program reads from standard input and prints to standard output. After you submit, I'll ask you a couple of follow-up questions. Good luck.",
    "round_id": "r1-oa-coding",
    "at": "2026-10-22T09:07:27+00:00"
  },
  {
    "role": "interviewer",
    "speaker": "Interviewer",
    "text": "Okay, we'll stop here. You ended the session during the first online assessment problem, before submitting any code, so there's nothing to grade yet. Your report shows that, and it includes a seven-day prep plan. Come back and run the full loop when you're ready.",
    "round_id": null,
    "at": "2026-10-22T09:26:04+00:00"
  }
];

export const amazonReport: FinalReport = {
  "overall_score": 0,
  "verdict": "no_hire",
  "summary": "The session ended during Round 1 (OA Coding: Warehouse Delivery Route) with no code submitted and no answers given. Rounds 2-6 (work simulation, loop DSA, Leadership Principles, OOD/light design, Bar Raiser) never started. A score of 0 means there was nothing to assess. It is not a judgement of your ability. In a real Amazon OA, though, leaving without a submission fails the OA automatically, and you would not reach the loop. Retake the full mock to get real feedback. The prep plan targets the areas Amazon SDE 1 loops weigh most: medium DSA (BFS/graphs, sliding window, DP, heaps), STAR stories mapped to LPs, and basic OOD.",
  "round_scores": [
    {
      "round_id": "r1-oa-coding",
      "round_name": "Online Assessment - Coding",
      "score": 0,
      "verdict": "no_hire",
      "rubric": [
        {
          "criterion": "Correctness of answers",
          "weight": 0.4,
          "score": 0,
          "comment": "Nothing was submitted, so no tests ran."
        },
        {
          "criterion": "Depth and reasoning",
          "weight": 0.3,
          "score": 0,
          "comment": "No approach or complexity analysis was given."
        },
        {
          "criterion": "Communication clarity",
          "weight": 0.3,
          "score": 0,
          "comment": "You did not explain anything before ending the session."
        }
      ],
      "strengths": [
        "None observed. The session ended before any work was shown."
      ],
      "gaps": [
        "No submission. In a real Amazon OA this is an automatic rejection.",
        "No evidence of recognising this as an unweighted shortest-path problem, which calls for BFS."
      ],
      "model_answer": "Recognise that the grid is an unweighted graph, so BFS gives the shortest path. Parse R, C and the grid, then locate S. Run BFS from S with a deque, holding (row, col) and a dist array (or a visited matrix plus level counting). For each popped cell, try the 4 neighbours: in bounds, not '#', not visited. Mark each neighbour visited when you enqueue it, not when you pop it, so no cell is queued twice. When you pop D, print its distance. If the queue empties first, print -1. Time and space are O(R*C), which is about 1e6 cells, so use an iterative BFS (recursive DFS would overflow the stack) and fast input. Edge cases: D adjacent to S, D walled off, S boxed in, and a single row or column. Likely follow-ups: return the path itself (store parent pointers), handle multiple drop points (multi-target BFS, or BFS from each), allow breaking k shelves (BFS over state (r, c, k)), and weighted cells (Dijkstra)."
    }
  ],
  "top_strengths": [
    "Not enough evidence yet. Complete at least one full round for an assessment."
  ],
  "top_gaps": [
    "Did not finish or submit the OA coding problem. Practise working under time pressure and always submit a working partial solution.",
    "Grid/graph BFS fluency is unverified. It is one of the most reported Amazon OA patterns.",
    "Leadership Principle STAR stories are unverified. They are weighted in every Amazon round and are central to the Bar Raiser.",
    "OOD and basic scaling reasoning are unverified."
  ],
  "prep_plan_7d": [
    {
      "day": 1,
      "focus": "Grid and graph BFS (core Amazon OA pattern)",
      "tasks": [
        "Solve Shortest Path in Binary Matrix, Number of Islands, Rotting Oranges, and 01 Matrix.",
        "Re-solve this mock's Warehouse Delivery Route from scratch in under 20 minutes, reading stdin and printing stdout.",
        "Write down why BFS gives the shortest path in unweighted graphs and why you mark cells visited on enqueue."
      ]
    },
    {
      "day": 2,
      "focus": "Sliding window, two pointers, and hash maps",
      "tasks": [
        "Solve Longest Substring Without Repeating Characters, Minimum Window Substring, Fruit Into Baskets, and Subarray Sum Equals K.",
        "Do one timed set: 2 mediums in 70 minutes, OA-style, submitting even partial solutions.",
        "Say the complexity aloud for each solution."
      ]
    },
    {
      "day": 3,
      "focus": "DP and heaps (reported loop and Bar Raiser problems)",
      "tasks": [
        "Solve House Robber I and II, Decode Ways, Maximum Product Subarray, Merge k Sorted Lists, and Top K Frequent Elements.",
        "For each, explain the recurrence or heap invariant before writing code.",
        "Practise one constraint-change follow-up per problem, such as streaming input or an O(1) memory requirement."
      ]
    },
    {
      "day": 4,
      "focus": "Leadership Principles story bank",
      "tasks": [
        "Write 8 STAR stories from projects, internships, hackathons, or coursework, covering Customer Obsession, Ownership, Bias for Action, Dive Deep, Earn Trust (disagreement), Deliver Results, Learn and Be Curious, and a failure story.",
        "Put a number in each Result (time saved, users, accuracy, deadline met), and make 'I', not 'we', the subject.",
        "Prepare 2-3 'why that and not something else?' follow-ups for each story."
      ]
    },
    {
      "day": 5,
      "focus": "Object-oriented design and basic scaling",
      "tasks": [
        "Design a parking lot and a shopping cart with percentage and fixed discounts aloud in 25 minutes each, covering entities, class relationships, key methods, and extensibility (strategy pattern for discounts).",
        "Revise the basics: caching, read replicas, load balancers, queues, and what breaks first at 10x users.",
        "Sketch a rate limiter (100 requests per minute per user) using token bucket and sliding-window approaches."
      ]
    },
    {
      "day": 6,
      "focus": "Work simulation and Bar Raiser practice",
      "tasks": [
        "Read about the Amazon OA work simulation format and practise choosing LP-aligned options: customer first, take ownership, escalate with data after trying to unblock.",
        "Run a mock Bar Raiser with a friend: 2 stories, 5+ follow-ups each, and check your details stay consistent.",
        "Record yourself answering 'Tell me about a time you failed' and cut the answer to 2 minutes."
      ]
    },
    {
      "day": 7,
      "focus": "Full mock loop retake",
      "tasks": [
        "Retake this full mock without stopping: OA coding, work simulation, DSA loop, LP, OOD, and Bar Raiser.",
        "Review every failed test and rubric gap, then redo the weakest problem.",
        "List your 3 biggest remaining gaps and plan the next week around them."
      ]
    }
  ]
};

export const amazonReportSpeech = "Okay, we'll stop here. You ended the session during the first online assessment problem, before submitting any code, so there's nothing to grade yet. Your report shows that, and it includes a seven-day prep plan. Come back and run the full loop when you're ready.";
