const express = require("express");
const { convert } = require("html-to-text");
const nodemailer = require("nodemailer");
const { createClient } = require("redis");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = 3000;

const client = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_PUBLIC_ENDPOINT,
        port: process.env.REDIS_PORT 
    }
});

app.use(cors({ credentials: true, origin: true }));
app.use(bodyParser.json());

(async () => {
  try {
    await client.connect();
    console.log("Connected Successfully");
  } catch (err) {
    console.log(err);
  }
})();

const transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});
app.get("/", async (req, res) => {
  res.json({
    Service: "Leetcode POTD Service",
  });
});

app.get("/send", async (req, res) => {
  const emails = await client.lRange("email", 0, 1000);
  emails.forEach((email) => {
    sendEmail(undefined, email);
    console.log(`Sent Email to ${email}\n`);
  });
  return res.json({ success: `Sent mail to ${emails.length} emails` });
});

app.post("/add", async (req, res) => {
  const { email, authToken } = req.body;
  if(authToken !== process.env.AUTH_TOKEN){
    console.log(authToken, process.env.AUTH_TOKEN)
    return res.status(401).json({error:'Unauthorized'})
  }
  const emails = await client.lRange("email", 0, 1000);
  if (emails.includes(email)) {
    return res.status(400).json({ error: "Already Subscribed" });
  }
  try {
    await client.lPush("email", email);
    console.log("Email added successfully");
    res.status(200).json({ success: true, data: { email } });
  } catch (err) {
    console.error("Error adding email:", err);
    res.status(500).json({ success: false, message: "Error adding email" });
  }
});

const sendEmail = async (extra = "", toEmail = "as416106@gmail.com") => {
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
          to: toEmail,
          subject: "Leetcode POTD",
          html: `${extra} \nHere is the today's Leetcode Problem of the Day<br><a href="https://leetcode.com/${POTD.link}">${POTD.question.title}</a><br>\nDifficulty:${POTD.question.difficulty}<br>\nAccuracy:${POTD.question.acRate}<br><br>${originalContent}`,
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

app.listen(PORT, () => {
  console.log(`Server listening at  http://localhost:${PORT}`);
});
