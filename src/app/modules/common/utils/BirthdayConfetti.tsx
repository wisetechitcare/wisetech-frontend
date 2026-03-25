import React, { useEffect, useRef, useState } from "react";
import JSConfetti from "js-confetti";
import { fetchAllUsers } from "@services/users";
import dayjs from "dayjs";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

const BirthdayCelebration = () => {
  const jsConfettiRef = useRef<JSConfetti | null>(null);
  const [birthdayUsers, setBirthdayUsers] = useState<any[]>([]);

  useEffect(() => {
    jsConfettiRef.current = new JSConfetti();
  }, []);

  useEffect(() => {
    const getAllUsers = async () => {
      try {
        const allUsers = await fetchAllUsers();
        const usersList = allUsers?.data?.users || [];
        const today = dayjs();

        const todayBirthdayUsers = usersList.filter((user: any) => {
          const dob = dayjs(user.dateOfBirth);
          return dob.date() === today.date() && dob.month() === today.month();
        });

        setBirthdayUsers(todayBirthdayUsers);

        if (todayBirthdayUsers.length && jsConfettiRef.current) {
          jsConfettiRef.current.addConfetti({
            emojis: [
              "🎉", "🎂", "🎈", "🍰", "🎁", "🥳", "🕯", "🎊", "🪅", "🎟",
              "🧁", "🍩", "🍫", "🍬", "🍪", "🍦", "🍮", "🎂", "🍫",
              "🍕", "🍔", "🌮", "🍿", "🍟", "🍣", "🍱", "🥟", "🍜", "🍙",
              "🍾", "🥂", "🍷", "🍸", "🍹", "🍺", "🍻", "🥤",
              "🌸", "🌷", "🌼", "🌺", "🌻", "💐",
              "❤️", "💖", "💝", "💘", "💕", "❣️", "😘", "😍", "🥰",
              "💃", "🕺", "🪩", "🙌", "👏", "🤩", "🤗",
              "🎶", "🎵", "🎧", "🎤", "🎸", "🎷", "🥁", "🪘",
              "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓",
              "✨", "🌟", "🔥", "⚡", "🌈", "🎠", "🎡", "🎢", "🧸", "🪄"
            ],
            emojiSize: 60,
            confettiNumber: 80,
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    getAllUsers();
  }, []);

  const MAX_INLINE = 1;
  const inlineNames = birthdayUsers.slice(0, MAX_INLINE).map((u) => `${u.firstName} ${u.lastName}`);
  const extraNames = birthdayUsers.slice(MAX_INLINE).map((u) => `${u.firstName} ${u.lastName}`);

  return (
    <div>
      {birthdayUsers.length > 0 && (
        <div>
          <div
            className="text-center d-flex justify-content-center align-items-center"
            style={{
              fontSize: "1rem",
              color: "#AA393D",
              fontWeight: "500",
              position: "relative",
            }}
          >
            🎉 Happy Birthday{" "}
            {inlineNames.join(", ")}
            {extraNames.length > 0 && (
              <>
                ,{" "}
                <OverlayTrigger
                  placement="bottom"
                  overlay={
                    <Tooltip id="birthday-tooltip">
                      {extraNames.map((name, idx) => (
                        <div key={idx}>{"🎉" + name}</div>
                      ))}
                    </Tooltip>
                  }
                >
                  <span
                    style={{
                      textDecoration: "underline",
                      cursor: "pointer",
                      backgroundColor: "white",
                      padding: "2px 5px",
                    }}
                  >
                    +{extraNames.length} more
                  </span>
                </OverlayTrigger>
              </>
            )}
            !
          </div>
        </div>
      )}
    </div>
  );
};

export default BirthdayCelebration;
