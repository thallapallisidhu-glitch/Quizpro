# QuizHub – Firebase Quiz Application

Bootstrap 5 + Vanilla JS + Firebase Auth + Firestore. No build step.

## Structure
```
index.html        Login / Signup
admin.html        Admin dashboard
student.html      Student dashboard
css/style.css     Navy/purple/blue glassmorphism theme
js/common.js      Firebase init (your config), toasts, role guard, shared tables
js/admin.js       Quizzes, questions, students, results, leaderboard
js/student.js     Quiz engine, timer, results, history, leaderboard
firestore.rules   Security rules
```

## Firebase setup
1. Open the Firebase Console → project **quizapplication-1cd32**.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
3. **Build → Firestore Database → Create database** (production mode, choose a region).
4. Firestore → **Rules** tab → paste the contents of `firestore.rules` → **Publish**.
5. Authentication → **Settings → Authorized domains**: make sure `localhost` (or your hosting domain) is listed.
6. Run the app through a local server (ES modules do not work from `file://`):
   - VS Code **Live Server**, or
   - `python -m http.server 8000` inside the folder, then open `http://localhost:8000`.
7. Sign up one **Admin** and one **Student** account (use two browsers/incognito).
8. Log in as Admin → Quizzes → **Add sample Python quiz** (creates and publishes the 10-question quiz below).
9. Log in as Student → take the quiz.

Optional hosting: `firebase init hosting` then `firebase deploy`.

## Sample Python quiz (10 questions, 1 mark each, 10 min, pass 40%)
| # | Question | A | B | C | D | Ans |
|---|----------|---|---|---|---|-----|
| 1 | Which keyword defines a function? | def | func | function | lambda | A |
| 2 | Type of [1, 2, 3]? | list | tuple | dict | set | A |
| 3 | Which is immutable? | list | dict | tuple | set | C |
| 4 | len('Python')? | 5 | 6 | 7 | Error | B |
| 5 | Single-line comment symbol? | // | # | /* | -- | B |
| 6 | 2 ** 3? | 6 | 8 | 9 | 5 | B |
| 7 | Add item to end of list? | add() | push() | append() | insert() | C |
| 8 | 'a' * 3? | aaa | a3 | Error | 3a | A |
| 9 | Keyword that handles exceptions? | catch | except | error | handle | B |
| 10 | Import the math module? | include math | import math | using math | require math | B |

## Firestore collections
`users/{uid}` name, email, role, createdAt · `quizzes/{id}` title, description, duration, passPercent, published, createdAt ·
`questions/{id}` quizId, question, optionA–D, correctAnswer, marks · `results/{id}` userId, userName, quizId, quizTitle, totalQuestions, correct, wrong, unanswered, score, totalMarks, percentage, passed, timeTaken, createdAt

## Production notes
- Anyone can choose "Admin" at signup (as you specified). Before going live, remove that option from `index.html` and set roles manually in Firestore, or the rules will let anyone self-promote.
- Grading is client-side, so students can read correct answers in the browser. For high-stakes exams, move grading to a Cloud Function.
- Deleting a student removes the Firestore profile (blocking dashboard access) but not the Auth account; remove that in the Firebase console.
