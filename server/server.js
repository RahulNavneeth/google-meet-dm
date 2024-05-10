import { WebSocketServer } from "ws"
import nodemailer from 'nodemailer';
import { START_CONVO } from "./template-message.js"
import * as dotenv from 'dotenv';
dotenv.config();

const ws = new WebSocketServer({ port: 6969 });

const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	// port: 587,
	secure: true,
	requireTLS: true,
	auth: {
		user: process.env.SENDER_MAIL,
		pass: process.env.SENDER_PASS
	},
	from: process.env.SENDER_MAIL
});

let DATA = {
	conversation: {},
	users: {}
}

function sendMail(mail_id, user_id, link_id) {
	return new Promise((resolve, reject) => {
		const mailOptions = {
			from: process.env.SENDER_MAIL,
			to: mail_id,
			subject: 'Invitation for google-meet-dm',
			text: `Hello, you've been invited by ${user_id} to join a Google Meet conversation in https://meet.google.com/${link_id}.\nTo get started, download the necessary extension here: <EXT_LINK>.\nThank you,\nrahulmnavneeth`
		};

		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				console.log(error);
				reject({ type: "send_mail", success: false, message: "error :3" });
			} else {
				console.log('Email sent: ' + info.response);
				resolve({ type: "send_mail", success: true, message: `mail sent succesfully to ${mail_id}!!` });
			}
		});
	})
}

ws.on("connection", (socket) => {
	socket.on("message", async (msg) => {
		const data = JSON.parse(msg);
		switch (data["type"]) {
			case "ping": {
				socket.send(JSON.stringify({ type: "ping", message: "pong" }));
				break;
			}
			case "fetch_users": {
				socket.send(JSON.stringify({ type: "fetch_users", data: DATA }));
				break;
			}
			case "send_mail": {
				sendMail(data["mail_id"], data["user_id"], data["link_id"]).then((res) => {
					socket.send(JSON.stringify(res));
				}).catch((err) => {
					socket.send(JSON.stringify(err));
				});
				break;
			}
			case "check_user_exist": {
				if (DATA["users"][`${data["link_id"]}-${data["user_id"]}`]) {
					socket.send(JSON.stringify({ type: "check_user_exist", success: true }));
					return;
				}
				socket.send(JSON.stringify({ type: "check_user_exist", success: false }));
				break;
			}
			case "create_user": {
				DATA["users"][`${data["link_id"]}-${data["user_id"]}`] = { conversation: [] };
				socket.send(JSON.stringify({ type: "create_user", success: true }));
				break;
			}
			case "start_convo": {
				const CONVO_ID_SORT_USER = [data["user_id"], data["convo_user_id"]].sort().join("-");
				const CONVO_ID = `${data["link_id"]}-${CONVO_ID_SORT_USER}`;
				DATA["users"][`${data["link_id"]}-${data["user_id"]}`]["conversation"].push(CONVO_ID);
				DATA["users"][`${data["link_id"]}-${data["convo_user_id"]}`]["conversation"].push(CONVO_ID);
				DATA["conversation"][CONVO_ID] = [START_CONVO(data["user_id"], data["convo_user_id"])];
				socket.send(JSON.stringify({ type: "start_convo", success: true, data: DATA["conversation"][CONVO_ID] }));
				break;
			}
		}
		console.log(DATA);
	})
	console.log("client connected");
})
