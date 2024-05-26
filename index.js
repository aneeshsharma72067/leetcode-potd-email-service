const express = require("express");
const { convert } = require("html-to-text");
const nodemailer = require("nodemailer");
const cron = require("node-cron");

require("dotenv").config();

const app = express();
const PORT = 3000;

const transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

app.get("/", (req, res) => {
  console.log(process.env.TEMP_DATA);
  sendEmail();
  res.json({
    Service: "Leetcode POTD Service",
  });
});

const sendEmail = async () => {
  const endpoint = "https://leetcode.com/graphql";
  const query = `
        query questionOfToday {
            activeDailyCodingChallengeQuestion {
                    date
                    link
                    question {
                    content
                    acRate
                    difficulty
                    frontendQuestionId: questionFrontendId
                    title
                    topicTags {
                        name
                    }
                }
            }
        }

    `;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  };

  const response = fetch(endpoint, options)
    .then((result) => result.json())
    .then(async (data) => {
      console.log(data);
      const POTD = data.data.activeDailyCodingChallengeQuestion;
      const originalContent = POTD.question.content;
      POTD.question.content = convert(POTD.question.content);
      const info = await transport
        .sendMail({
          from: "noreply@gmail.com",
          to: "as416106@gmail.com",
          subject: "Leetcode POTD",
          html: `Here is the today's Leetcode Problem of the Day<br><a href="https://leetcode.com/${POTD.link}">${POTD.question.title}</a><br>\nDifficulty:${POTD.question.difficulty}<br>\nAccuracy:${POTD.question.acRate}<br><br>${originalContent}`,
        })
        .then((r) => {
          console.log(r.accepted, "SUCCESS");
        })
        .catch((err) => {
          console.log(err);
        });
    })
    .catch((err) => console.log(err));
};

app.get("/potd", async (req, res) => {
  const endpoint = "https://leetcode.com/graphql";
  const query = `
        query questionOfToday {
            activeDailyCodingChallengeQuestion {
                    date
                    link
                    question {
                    content
                    acRate
                    difficulty
                    frontendQuestionId: questionFrontendId
                    title
                    topicTags {
                        name
                    }
                }
            }
        }

    `;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  };

  const response = fetch(endpoint, options)
    .then((result) => result.json())
    .then(async (data) => {
      console.log(data);
      const POTD = data.data.activeDailyCodingChallengeQuestion;
      const originalContent = POTD.question.content;
      POTD.question.content = convert(POTD.question.content);
      res.json(POTD);
    })
    .catch((err) => console.log(err));
});

cron.schedule(
  "21 10 * * *",
  () => {
    console.log("Running email job at 8:00AM");
    sendEmail();
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);

app.listen(PORT, () => {
  console.log(`Server listening at  http://localhost:${PORT}`);
});
