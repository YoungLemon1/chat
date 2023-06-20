import React, { useEffect, useState } from "react";
import Axios from "axios";
import moment from "moment";
import { Button } from "react-bootstrap";

function UserPage({ user }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [isSendToUser, setIsSendToUser] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await Axios.get(
          `http://localhost:5000/chatrooms/user/${user._id}`
        );
        const json = await res.json();
        console.log(json);
        setChatHistory(json);
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    }
    fetchData();
  }, [user]);
  /*function dateFormat(date) {
    if (date) {
      return moment(date).format("DD-MM-YYYY");
    } else return "";
  }*/
  async function getUser(id) {
    try {
      const res = await Axios.get(`http://localhost:5000/users/${id}`);
      return res.data;
    } catch (error) {
      console.error("Error fetching user", error);
    }
  }
  function SendToUserCkick() {
    setIsSendToUser(!isSendToUser);
  }

  return (
    <div>
      <h1>{user.username}</h1>
      <div id="chat-history">
        {chatHistory.map((chat) => {
          if (chat.isGroupChat) {
            return (
              <div key={chat._id}>
                {chat.groupChatPicture} {chat.groupChatName}
              </div>
            );
          }
          const otherUserID = chat.members.find(
            (memeber) => memeber !== user._id
          );
          const otherUser = getUser(otherUserID);
          return (
            <div key={chat._id}>
              <img
                className="user-image"
                src={otherUser.imageURL}
                alt={otherUser.username}
              ></img>
              <h6>{otherUser.username}</h6>
            </div>
          );
        })}
      </div>
      <div id="send-message-to-user">
        {!isSendToUser ? (
          <div />
        ) : (
          <div>
            <label htmlFor="send-to">Search user or group</label>
            <input></input>
          </div>
        )}
        <Button id="send-to-user-btn" onClick={SendToUserCkick}>
          {!isSendToUser ? "+" : "X"}
        </Button>
      </div>
    </div>
  );
}

export default UserPage;
