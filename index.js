require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const cors = require("cors");

const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:5173",],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3qgozix.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// jwt middleware
const verifyCookie = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access" });
    }
    req.user = decoded;
    next();
  });
};

// mongodb connection
const dbConnect = async () => {
  try {
    client.connect();
    console.log("DB Connected Successfully✅");
  } catch (error) {
    console.log(error.name, error.message);
  }
};
dbConnect();

const database = client.db("todoDB");
const usersCollections = database.collection("usersDB");
const taskCollections = database.collection("taskDB");

// jwt api method
app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });
  res
    .cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .send({ success: true });
});

app.post("/logout", (req, res) => {
  const user = req.body;
  res.clearCookie("token", { maxAge: 0 }).send({ success: true });
});

app.get("/", (req, res) => {
  res.send("server is running data will be appear soon...");
});

// users api method
app.get("/users", async (req, res) => {
  const cursor = usersCollections.find();
  const result = await cursor.toArray();
  res.send(result);
});

app.get("/users/:email", verifyCookie, async (req, res) => {
  const userEmail = req.params.email;
  const query = { email: userEmail };
  const result = await usersCollections.findOne(query);
  res.send(result);
});

app.post("/users", async (req, res) => {
  const user = req.body;
  const email = user?.email;
  const query = { email: email };
  const isExists = await usersCollections.findOne(query);
  if (isExists) {
    res.send({ user: "Exist" });
  } else {
    const result = await usersCollections.insertOne(user);
    res.send(result);
  }
});

// task api method
app.post("/task", verifyCookie, async (req, res) => {
  const assignmentInfo = req.body;
  const result = await taskCollections.insertOne(assignmentInfo);
  res.send(result);
});

app.get("/task/:email", verifyCookie, async (req, res) => {
  const createdBy = req.params.email;
  if (req.user.email !== createdBy) {
    return res.status(403).send({ message: "Forbidden Access" });
  }
  const query = { email: createdBy };
  const result = await taskCollections.find(query).toArray();
  res.send(result);
});

app.get("/task/:id", verifyCookie, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await taskCollections.findOne(query);
  res.send(result);
});

app.delete("/task/:id", verifyCookie, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await taskCollections.deleteOne(query);
  res.send(result);
});

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
});
