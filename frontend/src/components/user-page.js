import React, { useEffect, useState, useRef } from "react";
import Axios from "axios";
import Chat from "./chat";
import moment from "moment";
import { Button } from "react-bootstrap";
import { io } from "socket.io-client";
import ChatHistory from "./chatHistory";

function UserPage({ user, setUser }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [currentChat, setCurrentChat] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [chatHistoryLoading, setChatHistoryLoading] = useState(true);
  const socket = useRef(null);

  //#region lifecycle functions
  useEffect(() => {
    // Initialize the socket connection
    socket.current = io(process.env.REACT_APP_API_URL);
    // Clean up the socket connection on component unmount
    return () => {
      socket.current.disconnect();
    };
  }, []);

  useEffect(() => {
    const userId = user._id.toString();
    socket.current.emit("user_connected", userId);
  }, [user._id]);

  useEffect(() => {
    if (!socket) return;
    // Fetch the initial chat history
    async function fetchChatHistory() {
      try {
        const userId = user._id.toString();
        const res = await Axios.get(
          `http://localhost:5000/messages/last-messages?userId=${userId}`
        );
        const data = res.data;
        setChatHistory(data);
        console.log("successfully fetched user chat history", data);
      } catch (error) {
        console.error("Failed to fetch user chat history", error);
      }
      setChatHistoryLoading(false);
    }

    // Fetch the initial chat history and add event listener on socket change
    fetchChatHistory();

    // Fetch the initial chat history and add event listener on socket change
  }, [socket, setChatHistory, user._id]);

  useEffect(() => {
    if (!socket) return;
    // Add the event listener for receiving messages
    socket.current.on("receive_message", (message, senderData) => {
      const chatStrObjectId = message.conversation
        ? message.conversation
        : message.chatroom;
      const chat = chatHistory.find(
        (chat) => chat.strObjectId === chatStrObjectId
      );

      if (chat) {
        chat.lastMessage = message;
        console.log(message);
        if (message.isHumanSender) {
          setChatHistory((prevChatHistory) => [
            chat,
            ...prevChatHistory.filter((prevChat) => prevChat.id !== chat.id),
          ]);
        } else {
          // If the sender is the system, only update the lastMessage property
          setChatHistory([...chatHistory]);
        }
      } else {
        const members = [user._id.toString(), message.sender];
        const sortedMembers = members.map((member) => member.toString()).sort();
        console.log("sorted", sortedMembers);
        const chatId = sortedMembers.reduce((acc, member) => acc + member, "");
        const newChat = {
          id: chatId,
          strObjectId: chatStrObjectId,
          title: senderData.username,
          imageURL: senderData.imageURL,
          lastMessage: message,
        };
        setChatHistory((prevChatHistory) => [newChat, ...prevChatHistory]);
      }
    });

    // Clean up the event listener when the component unmounts
    return () => {
      if (socket) {
        socket.current.off("receive_message");
      }
    };
  }, [socket, chatHistory, setChatHistory, user._id]);

  //#endregion

  //#region enter chat functions
  function enterChat(chat) {
    setSearchText("");
    socket.current.emit("join_room", chat.id);
    setCurrentChat(chat);
    console.log(`${user.username} entered chat ${chat.id}`);
  }

  async function tryEnterChat() {
    if (!searchText) {
      return;
    }
    const chat = chatHistory.find((c) => c.title === searchText);
    if (chat) {
      enterChat(chat);
      return;
    }

    let userData;
    let chatroomData;

    try {
      const resUserSearch = await Axios.get(
        `http://localhost:5000/users?username=${searchText}`
      );
      userData = resUserSearch.data;
    } catch (error) {
      console.error("user search error", error);
      // Handle the error for the user search API request
    }

    try {
      const resChatroomSearch = await Axios.get(
        `http://localhost:5000/chatrooms?chatroomTitle=${searchText}`
      );
      chatroomData = resChatroomSearch.data;
    } catch (error) {
      console.error("chatroom search error", error);
      // Handle the error for the group chat search API request
    }

    console.log("user data", userData);
    console.log("group data", chatroomData);

    if (userData) {
      const members = [user._id, userData._id];
      const sortedMembers = members.map((member) => member.toString()).sort();
      console.log("sorted", sortedMembers);
      const conversationId = sortedMembers.reduce(
        (acc, member) => acc + member,
        ""
      );
      console.log("tempId", conversationId);
      const conversation = {
        id: conversationId,
        strObjectId: null,
        members: members,
        title: userData.username,
        imageURL: userData.imageURL,
        isGroupChat: false,
        newChat: true,
      };
      //socket.emit("joined_new_conversation", user._id.toString());
      setChatHistory([...chatHistory, conversation]);
      enterChat(conversation);
    } else if (chatroomData) {
      const chatroom = {
        id: chatroomData._id,
        strObjectId: chatroomData._id,
        members: chatroomData.members,
        title: chatroomData.title,
        imageURL: chatroomData.imageURL,
        isGroupChat: true,
        newChat: true,
      };
      setChatHistory([...chatHistory, chatroom]);
      enterChat(chatroom);
    } else setSearchError("No search results found");
  }
  //#endregion

  function dateFormat(date) {
    if (date) {
      return moment(date).format("HH:mm");
    } else return "";
  }

  function logout() {
    console.log(`${user.username} logged out successefully`);
    setUser(null);
  }

  return (
    <div id="user-page">
      {!currentChat ? (
        <div>
          <h1 style={{ display: "inline", float: "left", margin: "0.5rem" }}>
            {user.username}
          </h1>
          <div id="logout-container">
            <Button id="logout" onClick={logout}>
              logout
            </Button>
          </div>
          <div id="loged-user-username"></div>
          <div className="chat-search">
            <div>
              <input
                className="search-bar"
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setSearchError("");
                }}
                onKeyDown={(event) => {
                  event.key === "Enter" && tryEnterChat();
                }}
                placeholder="Chat with a user or a group"
              ></input>
              <button
                className="submit-btn"
                disabled={searchText === ""}
                onClick={tryEnterChat}
              >
                Enter Chat
              </button>
            </div>
            <div className="search-error">{searchError}</div>
          </div>
          <ChatHistory
            chatHistory={chatHistory}
            chatHistoryLoading={chatHistoryLoading}
            setChatHistoryLoading={setChatHistoryLoading}
            loggedUserId={user._id}
            dateFormat={dateFormat}
            enterChat={enterChat}
          ></ChatHistory>
        </div>
      ) : (
        <Chat
          chat={currentChat}
          setCurrentChat={setCurrentChat}
          socket={socket.current}
          loggedUser={user}
          chatHistory={chatHistory}
          setChatHistory={setChatHistory}
          dateFormat={dateFormat}
        ></Chat>
      )}
      <div />
    </div>
  );
}

export default UserPage;
