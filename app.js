import express from "express";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcrypt";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import databaseClient from "./services/database.mjs";
import { mockUserActivity } from "./data/mockUserActivity.js";
import { mockUserInfo } from "./data/mockUserInfo.js";
import { ObjectId } from "mongodb";

const HOSTNAME = process.env.SERVER_IP || "localhost";
const PORT = process.env.SERVER_PORT || 8000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads");
  },
  filename: function (req, file, cb) {
    const name = uuidv4();
    const extension = file.mimetype.split("/")[1];
    const filename = `${name}.${extension}`;
    cb(null, filename);
  },
});

dotenv.config();
const upload = multer({ storage });
const app = express();
// const port = 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cors());
app.use(helmet());

app.get("/user/activity/:userId", async (req, res) => {
  const { userId } = req.params;
  // const data = [...mockUserActivity];
  // const userData = data.filter((user) => user.userId === Number(userId));
  const userData = await databaseClient
    .db()
    .collection("user-activity")
    .find({ userId: new ObjectId(userId) })
    .toArray();
  res.json({ count: userData.length, data: userData });
});

app.get("/user/info/:userId", async (req, res) => {
  const { userId } = req.params;
  // const data = [...mockUserInfo];
  // const userData = data.filter((user) => user.userId === Number(userId));
  const userData = await databaseClient
    .db()
    .collection("user-info")
    .find({ _id: new ObjectId(userId) })
    .toArray();
  res.json({ data: userData });
});

app.post("/user/changePassword/:userId", async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;
  const saltRounds = 12;
  const hashedPassword = bcrypt.hashSync(newPassword, saltRounds);
  // const data = [...mockUserInfo];
  // const userData = data.filter((user) => user.userId === Number(userId))[0];
  // userData.password = hashedPassword;
  await databaseClient
    .db()
    .collection("user-info")
    .updateOne(
      { _id: new ObjectId(userId) },
      { $set: { password: hashedPassword } }
    );
  res.send("OK");
});

app.patch(
  "/user/editProfile/:userId",
  upload.single("image"),
  async (req, res) => {
    const { userId } = req.params;
    const { name, email, phoneNumber } = req.body;
    const { filename } = req.file;
    // const data = [...mockUserInfo];
    // const userData = data.filter((user) => user.userId === Number(userId))[0];
    // userData.fullName = name;
    // userData.email = email;
    // userData.phone = phoneNumber;
    // userData.imagePath = `/uploads/${filename}`;
    await databaseClient
      .db()
      .collection("user-info")
      .updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            fullName: name,
            email: email,
            phone: phoneNumber,
            imagePath: `/uploads/${filename}`,
          },
        }
      );
    res.send("OK");
  }
);

// mock upload
// app.patch("/user/:userId/uploads", upload.single("image"), (req, res) => {
//   const { filename } = req.file;
//   const { name } = req.body;
//   console.log(req.file);
//   const todoId = parseInt(req.params.userId, 10);
//   const updatedTodo = updateTodo(todoId, { imagePath: `/uploads/${filename}` });
//   if (!updatedTodo) {
//     res.status(404).json({ error: { message: "todo not found" } });
//   }

//   res.json({ data: [{ id: todoId, imagePath: `/uploads/${filename}`, name }] });
// });

// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`);
// });

// initilize web server
const currentServer = app.listen(PORT, HOSTNAME, () => {
  console.log(
    `DATABASE IS CONNECTED: NAME => ${databaseClient.db().databaseName}`
  );
  console.log(`SERVER IS ONLINE => http://${HOSTNAME}:${PORT}`);
});

const cleanup = () => {
  currentServer.close(() => {
    console.log(
      `DISCONNECT DATABASE: NAME => ${databaseClient.db().databaseName}`
    );
    try {
      databaseClient.close();
    } catch (error) {
      console.error(error);
    }
  });
};

// cleanup connection such as database
process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);
