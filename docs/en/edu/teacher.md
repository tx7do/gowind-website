# Teacher and Admin Guide

The teacher side serves subject teachers and academic staff through the **web admin console**, covering the full teaching workflow from building the question bank, assembling and publishing papers, and assigning homework to grading and learning analytics; the admin side serves school / institution administrators, handling organization and people, roles and permissions, audit logs, AI infrastructure, and other platform-level governance.

::: tip About accounts
Teacher accounts are **created centrally** in the console by the school / institution administrator; students don't need to be entered one by one by teachers — they self-register on the student client and then join the right class with a **class join code**.
:::

## 1. Base Data Preparation

Before getting started, complete three kinds of base data:

| Module | Description |
|------|------|
| Subject management | Maintain the subject system — Chinese, math, English, and more |
| Knowledge-point management | Maintain each subject's knowledge points as a **tree structure** — the shared skeleton for question selection, paper assembly, and weak-point statistics |
| Class management | Let students join classes on their own with **class join codes**, no per-student data entry needed |

::: tip The finer the knowledge-point tree, the more accurate the personalization
Smart practice's weak-point question selection, AI paper assembly's drawing scope, and the learning analytics dashboard's weak knowledge-point ranking all depend on the knowledge-point tree. We recommend mapping out "subject → chapter → knowledge point" completely before building the question bank.
:::

## 2. Building the Question Bank

The question bank is the platform's core asset, and the teacher side provides a complete toolchain from entry to quality control:

| Capability | Description |
|------|------|
| Six question types | Six mainstream question types covering both objective and subjective questions |
| Excel bulk import/export | Import questions in bulk by template; export the bank too, edit offline collaboratively, then re-import |
| AI question generation | Pick knowledge points and let AI generate questions; the system deduplicates via **semantic vectors** to avoid repeating existing questions |
| OCR photo-based question import | Photograph paper exams or study aids and the questions are recognized in — fast digitization of existing question inventories |
| AI illustration | AI illustrates questions automatically, saving manual drawing |
| Similar-problem search | Search for similar problems semantically to avoid duplicate entries of the same type |
| Draft/published states | Questions are saved as drafts first and enter the usable pool only after teacher review and confirmation |

::: tip Recommended bank-building flow
Paper exams from past years → OCR photo import → AI-generated supplementary questions (semantic deduplication applied automatically) → teacher reviews drafts one by one → publish. One teacher can build a subject's base question bank in a fairly short time.
:::

## 3. Paper Assembly and Publishing Controls

### Three Ways to Assemble a Paper

| Method | How it works | Suitable scenario |
|------|------|----------|
| Manual assembly | Pick problems from the bank one by one, with full control over the paper's structure | Formal tests, curated papers |
| AI paper assembly | Set knowledge-point and difficulty requirements; the system draws questions automatically and **balances them evenly**, assembling the paper in one click | Daily practice, fast paper creation |
| Re-practice paper | **Generate a re-practice paper from the class's high-frequency wrong questions in one click** | Organizing re-training around class-wide common errors |

### Publishing Controls

When publishing a paper, multiple controls can be set to fit different teaching scenarios:

| Control | Description | Typical use |
|--------|------|----------|
| Time window | Restricts when answering can begin | Coordinated exams for the whole class |
| Attempt limit | Restricts the number of attempts | Formal tests allow one attempt only |
| Time limit | Restricts the duration of each attempt | Mimicking the pace of a real exam |
| Leaderboard toggle | Decides whether a leaderboard is generated and shown | Keep it off for daily practice to ease ranking pressure |

::: warning Turn off leaderboards for after-class practice
Leaderboards suit tests, where they spark competition; for daily practice we recommend turning them off so students don't grind for rank while neglecting corrections and review. Combining the leaderboard with attempt and time limits balances motivation and fairness.
:::

## 4. Homework and Submission Chasing

Homework = **class + paper + deadline**, and assigning and managing it is straightforward:

- When assigning, choose the class, attach the paper, and set the deadline;
- **Real-time completion statistics**: submission progress is visible in real time, no asking students one by one;
- **One-click chasing**: send a submission reminder to everyone who hasn't finished, in one click;
- **Homework extensions**: for special cases, adjust the deadline and the student side updates in sync.

On the student side, homework appears in "Today's Tasks" and the homework list (see the [Student Client Guide](/en/edu/student.md)), and items approaching their deadline are also aggregated into the to-dos as reminders.

## 5. Grading Center

The Grading Center is the module teachers use most often, built on the idea of "**AI first pass, teacher final call**":

| Capability | Description |
|------|------|
| AI grading results | Objective questions are already scored instantly; subjective questions get an AI first pass with comments attached |
| One-click accept | For questions where the AI score is acceptable, **accept with one click and finalize in bulk**, freeing teachers from repetitive work |
| Manual score override | Override scores you disagree with; related statistics **recalculate automatically** after any change — no manual adjustments |
| Page-switch count alerts | See each examinee's page-switch count, with automatic alerts on abnormal counts to help judge exam discipline |

::: warning AI scores are suggestions, not verdicts
AI grading exists for efficiency, and **final grades rest with the teacher's judgment**. Recommended grading rhythm: accept clearly reasonable scores in bulk first, then concentrate on reviewing subjective questions and doubtful answer sheets; for AI-generated questions, review them together with the "suspect-question alerts".
:::

## 6. Learning Analytics Dashboard

The learning analytics dashboard turns class answering data into charts and reports ready for teaching use:

| Dashboard capability | Teaching use |
|----------|----------|
| Accuracy overview | Quickly judge the class's overall mastery |
| High-frequency wrong-question ranking | Find the questions the class gets wrong most and review them in class |
| Weak knowledge-point ranking | Locate common weak knowledge points and schedule focused review |
| Dual-axis 30-day trend chart | Watch answer volume and accuracy trends together |
| Error-cause distribution | Understand the makeup of errors: carelessness, unclear concepts, or misreading the question |
| Suspect-question alerts | Automatic alerts when an AI-generated question's error rate is abnormal, prompting review of the question's own quality |
| AI class report | AI generates a Markdown-format class learning report, ready for teaching research and parent communication |
| Printable wrong-question sheets | Generate printable wrong-question sheets by class or student for paper-based re-practice |

::: tip Recommended rhythm for review lessons
After an exam, start with the "high-frequency wrong-question ranking + error-cause distribution" to prepare the review lesson → afterwards, use a "re-practice paper" for targeted re-training → a few days later, check the "weak knowledge-point ranking" to verify weak points are shrinking, then decide whether a second review round is needed.
:::

## 7. A Complete Teaching-Cycle Workflow

Stringing the capabilities above together, a "unit" teaching cycle typically runs like this:

| Stage | Teacher action | Platform support |
|------|----------|----------|
| Pre-class bank building | Reuse past exams + add new questions | OCR photo import, AI question generation, semantic deduplication, draft review |
| Unit practice | Assign daily practice homework | Class + paper + deadline, real-time completion statistics, one-click chasing |
| Unit test | Run a formal test | Time window + attempt limit + time limit, shuffled questions and options, page-switch alerts |
| Grading and review | Grade and hold the in-class review | AI grading + one-click accept to finalize; high-frequency wrong-question ranking and error-cause distribution aid lesson prep |
| Review and consolidation | Re-train weak points | Generate a re-practice paper from high-frequency wrong questions in one click; the system schedules student reviews automatically along the forgetting curve |
| Cycle retrospective | Teaching research and parent communication | AI class report in one click; printable wrong-question sheets distributed for paper re-practice |

At the end of each cycle, students' wrong questions and weak knowledge points are retained and become input for the next round of smart practice and review plans — teaching data gets more accurate the more it's used.

## 8. System Administration Overview

The admin side (system administration) serves school / institution administrators with platform-level governance:

| Module | Description |
|------|------|
| Data dashboard | Platform-wide usage overview and AI insights |
| Organization and people | Organizational structure and personnel management for the school / institution |
| Roles and permissions (RBAC) | Console features and data access assigned by role — teachers, academic staff, and administrators each stay in their lane |
| Dictionaries / multilingual / files / tasks | Platform base configuration, files, and background task management |
| Audit logs | Six categories of audit logs keep key operations traceable end to end |
| AI infrastructure | Model provider management (keys stored encrypted), knowledge base RAG, AI conversation, natural-language data queries, usage statistics, and content safety |

::: tip The two things administrators should watch most
One, **AI usage statistics**: understand calls and consumption per model provider to control costs. Two, **audit logs**: check key operation records periodically to keep platform usage compliant and traceable. Model keys are stored encrypted inside the platform and never exposed to ordinary users.
:::

## 9. FAQ

**Q: What if students don't have accounts?**
A: The student client supports self-registration — teachers only need to hand out the **class join code**, and students join the class with it after registering.

**Q: Can AI-generated questions be used directly?**
A: AI-generated questions go through semantic deduplication and suspect-question alerts, but we recommend keeping the flow "draft → teacher review → publish", confirming each question's content before it enters the usable pool.

**Q: With dozens of answer sheets per class, can grading keep up?**
A: Subjective questions get an AI first pass with comments; teachers one-click accept reasonable scores to finalize in bulk and only review a few doubtful sheets. Objective questions are already scored instantly at submission — no manual work at all.

**Q: Is historical data still there after a new semester or a class change?**
A: Answering, wrong-question, and learning analytics data accumulate continuously per student; once a student joins a new class with a join code, that class's dashboard and rankings update accordingly.

---

For product inquiries or deployment delivery, contact us on WeChat: **yang_lin_bo**, or email <yanglinbo@gmail.com>.

Further reading:

- [Product Introduction](/en/edu/intro.md)
- [Student Client Guide](/en/edu/student.md)
