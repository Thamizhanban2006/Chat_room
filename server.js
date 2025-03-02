const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});
const mongoose = require("mongoose");
const multer = require("multer");

mongoose.connect("mongodb+srv://root:root@cluster0.8oltf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

const messageSchema = new mongoose.Schema({
  sender: String,
  text: String,
  type: String,
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

let onlineUsers = {}; // Store connected users

io.on("connection", async (socket) => {
  console.log("User connected:", socket.id);

  // Send chat history when a user joins
  const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
  socket.emit("load_old_messages", messages);

  // Handle username setting
  socket.on("set_username", (username) => {
    onlineUsers[socket.id] = username;
    io.emit("update_user_list", Object.values(onlineUsers));
  });

  // Handle messages
  socket.on("send_message", async (data) => {
    const newMessage = new Message(data);
    await newMessage.save(); // Save to MongoDB
    io.emit("receive_message", data);
  });

  // Handle typing indicator
  socket.on("typing", (username) => {
    socket.broadcast.emit("user_typing", username);
  });

  socket.on("stop_typing", () => {
    socket.broadcast.emit("user_stopped_typing");
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    delete onlineUsers[socket.id];
    io.emit("update_user_list", Object.values(onlineUsers));
    console.log("User disconnected:", socket.id);
  });
});

// File upload with Multer
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ url: `http://localhost:5000/uploads/${req.file.filename}` });
});

// Start the server
server.listen(5000, () => {
  console.log("Server running on port 5000");
});
