import React, { useEffect, useState } from "react";
import { celebrate } from "@/ds/effects/celebrate";
import { fetchTodayBirthdays } from "@services/users";
import { canSection } from "@utils/can";
import { useSelector } from "react-redux";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

const BirthdayCelebration = () => {
  const [birthdayUsers, setBirthdayUsers] = useState<any[]>([]);
  // Re-evaluated when access loads: the header can mount before it, and a one-shot check
  // made then would read "no access" and never celebrate.
  const canSeeBirthdays = useSelector(() => canSection("calendar", "read"));

  useEffect(() => {
    const getAllUsers = async () => {
      // Birthdays belong to the Calendar: Read on it is enough to see the celebration. It used
      // to load the whole user list, which needs People access — so ordinary employees, the
      // birthday person included, got a silent 403 and no confetti.
      if (!canSeeBirthdays) return;
      try {
        // The server already picks today's birthdays (same India clock as the greeting email)
        // and only current employees, so there is nothing left to filter here.
        const res = await fetchTodayBirthdays();
        const todayBirthdayUsers = res?.data?.users || [];

        setBirthdayUsers(todayBirthdayUsers);

        if (todayBirthdayUsers.length) {
          void celebrate({
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
  }, [canSeeBirthdays]);

  const MAX_INLINE = 1;
  const inlineNames = birthdayUsers.slice(0, MAX_INLINE).map((u) => `${u.firstName} ${u.lastName}`);
  const extraNames = birthdayUsers.slice(MAX_INLINE).map((u) => `${u.firstName} ${u.lastName}`);

  return (
    <>
      {birthdayUsers.length > 0 && (
        <div className="wt-greeting d-none d-lg-flex align-items-center me-5">
          <div
            className="text-center d-flex justify-content-center align-items-center"
            style={{
              fontSize: "1rem",
              color: "#1E3A8A",
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
    </>
  );
};

export default BirthdayCelebration;
