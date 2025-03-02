import { useState, useEffect } from "react";
import io from "socket.io-client";
import './app.css';

const socket = io("http://localhost:5000");

const App = () => {
  const [username, setUsername] = useState("");
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [showUserList, setShowUserList] = useState(false); // Toggle dropdown

  useEffect(() => {
    socket.on("update_user_list", (users) => setOnlineUsers(users));
    return () => socket.off("update_user_list");
  }, []);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });
    return () => socket.off("receive_message");
  }, []);

  useEffect(() => {
    socket.on("load_old_messages", (messages) => setMessages(messages));
    return () => socket.off("load_old_messages");
  }, []);

  useEffect(() => {
    socket.on("user_typing", (username) => setTypingUser(`${username} is typing...`));
    socket.on("user_stopped_typing", () => setTypingUser(""));
    return () => {
      socket.off("user_typing");
      socket.off("user_stopped_typing");
    };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      const msgData = { text: message, sender: username, type: "text" };
      socket.emit("send_message", msgData);
      setMessage(""); // Clear input
    }
  };

  const handleTyping = () => {
    socket.emit("typing", username);
    setTimeout(() => socket.emit("stop_typing"), 2000);
  };


  return (
    <div className="chat-container">
      {!isUsernameSet ? (
        <div className="username-input">
          <h2>Enter Your Username</h2>
          <input
            type="text"
            placeholder="Enter username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={() => {
            setIsUsernameSet(true);
            socket.emit("set_username", username);
          }}>
            Join Chat
          </button>
        </div>
      ) : (
        <>
          <h2>Chat Room</h2>

   
          <div className="dropdown">
            <button className="dropdown-btn" onClick={() => setShowUserList(!showUserList)}>
              Online Users ({onlineUsers.length}) ▼
            </button>
            {showUserList && (
              <ul className="dropdown-list">
                {onlineUsers.map((user, index) => (
                  <li key={index}>{user}</li>
                ))}
              </ul>
            )}
          </div>

          <p className="typing-indicator">{typingUser}</p> {/* Typing Indicator */}

          <div className="chat-box">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender === username ? "sent" : "received"}`}>
                <strong className="sender">{msg.sender}</strong>
                {msg.type === "image" ? <img src={msg.text} alt="Uploaded file" width="200" /> : <p>{msg.text}</p>}
              </div>
            ))}
          </div>

          <div className="input-container">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
            />
            
            <button onClick={sendMessage}>Send</button>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
