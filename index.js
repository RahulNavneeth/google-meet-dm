// global var
let LINK_ID;
let USER_MAIN;
let WS = new WebSocket("ws://localhost:6969");

// element id
const PEOPLE_CONTAINER_ID = "user-cont";
const WELCOME_USER = "wl-u";

function ws_global_actions(type) {
	return new Promise((resolve, _reject) => {
		WS.onmessage = (event) => {
			const data = JSON.parse(event["data"]);
			if (data["type"] === type) {
				resolve(data);
			}
		}
	});
}

function fetch_users(TAB_ID) {
	return new Promise((resolve, reject) => {
		chrome.tabs.sendMessage(TAB_ID, { action: "fetch_users" }, (response) => {
			if (chrome.runtime.lastError) {
				reject("FETCH_USER: " + chrome.runtime.lastError.message);
			} else {
				resolve(response);
			}
		});
	});
}

async function fetch_users_server() {
	WS.send(JSON.stringify({ type: "fetch_users", user_id: USER_MAIN, link_id: LINK_ID }));
	return await ws_global_actions("fetch_users");
}

async function check_user_server() {
	WS.send(JSON.stringify({ type: "check_user_exist", user_id: USER_MAIN, link_id: LINK_ID }));
	const res = await ws_global_actions("check_user_exist");
	return res["success"];
}

async function create_user_server() {
	WS.send(JSON.stringify({ type: "create_user", user_id: USER_MAIN, link_id: LINK_ID }));
	const res = await ws_global_actions("create_user");
	return res["success"];
}

async function sendMail(mail_id) {
	WS.send(JSON.stringify({ type: "send_mail", user_id: USER_MAIN, link_id: LINK_ID, mail_id: mail_id }));
	return await ws_global_actions("send_mail");
}

function sort_data(data) {
	const priority = { 'CHAT': 1, 'START_CONVO': 2, 'NO_EXT': 3 };
	data.sort((a, b) => priority[a["type"]] - priority[b["type"]]);
	return data;
}

function build_HTML_home(data) {
	// sort data
	data = sort_data(data);

	// welcome user
	document.getElementById(WELCOME_USER).innerText = `welcome, ${USER_MAIN} 🙏`;

	// room ID
	document.getElementById("room-id").innerText = LINK_ID;

	// users
	const PEOPLE_CONTAINER = document.getElementById(PEOPLE_CONTAINER_ID);

	if (data.length == 0) {
		PEOPLE_CONTAINER.innerHTML = "<div>feel lonely?</div>"
		return;
	}

	const BREAK = document.createElement("div");
	BREAK.innerHTML = `<br><div><b>${data[0]["type"] === "CHAT" ? "Chat" : data[0]["type"] === "START_CONVO" ? "Start a conversation" : "Invite"}<b></div>`;
	PEOPLE_CONTAINER.appendChild(BREAK);
	if (data[0]["type"] === "NO_EXT") {
		const BREAK = document.createElement("div");
		BREAK.innerHTML = ` <button class=\"__invite_user_btn__\" id=\"__invite_user_btn__\">invite?</button>`;
		PEOPLE_CONTAINER.appendChild(BREAK);
	}

	for (let i = 0; i < data.length; i++) {
		if (i && data[i]["type"] != data[i - 1]["type"]) {
			const BREAK = document.createElement("div");
			BREAK.innerHTML = `</br> <div><b>${data[i]["type"] === "CHAT" ? "Chat" : data[i]["type"] === "START_CONVO" ? "Start a conversation" : "Invite"}<b></div>`;
			PEOPLE_CONTAINER.appendChild(BREAK);
			if (data[i]["type"] === "NO_EXT") {
				const BREAK = document.createElement("div");
				BREAK.innerHTML = ` <button class=\"__invite_user_btn__\" id=\"__invite_user_btn__\">invite?</button>`;
				PEOPLE_CONTAINER.appendChild(BREAK);
			}
		}
		const USER_ID = data[i]["user_id"]; const USER_TYPE = data[i]["type"];
		let PEOPLE_NODE = document.createElement("div");

		switch (USER_TYPE) {
			case "NO_EXT": {
				PEOPLE_NODE.innerHTML = `
						<div class=\"__user __invite_user\">
							<div>${i + 1}. ${USER_ID}</div>
						    <button class=\"__invite_user_btn\" id=\"__invite_user_btn\">invite?</button>
		    			</div>`;
				break;
			}
			case "START_CONVO": {
				PEOPLE_NODE.innerHTML = `
						<div class=\"__user __start_convo\">
							<div>${i + 1}. ${USER_ID}</div>
							<button class=\"__start_convo_btn\">send (hi👋)</button>
		    			</div>`;
				break;
			}
		}

		PEOPLE_CONTAINER.appendChild(PEOPLE_NODE);
	}

	// alert(JSON.stringify(data));
	return;
}

document.addEventListener("DOMContentLoaded", () => {
	chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {

		const TAB_ID = tabs[0].id;

		if (!tabs[0].url.includes("meet.google")) {
			document.body.innerHTML = "<div style='text-align: center;'>kindly open gmeet to access the plugin!!!<div>";
			return;
		}

		const sp = tabs[0].url.split('/');
		if (sp[sp.length - 1].length == 0) {
			document.body.innerHTML = "<div style='text-align: center;'>kindly join a meeting to access the plugin!!!<div>";
			return;
		}
		LINK_ID = sp[sp.length - 1].split("?")[0];

		let user_data = [];
		try { user_data = (await fetch_users(TAB_ID))["users"] } catch (e) { alert(e) };

		if (user_data.length == 0) {
			document.body.innerHTML = "<div style='text-align: center;'>kindly open the \"People\" tab!!!<div>";
			return;
		}

		USER_MAIN = user_data[0] || "Rahul M. Navneeth";

		user_data.shift();

		if (!await check_user_server()) await create_user_server();

		let user_data_server = {};
		user_data_server = (await fetch_users_server())["data"];

		let build_data = [];

		for (let i = 0; i < user_data.length; i++) {
			if (!Object.keys(user_data_server).includes(`${LINK_ID}-${user_data[i]}`)) {
				build_data.push({ user_id: user_data[i], type: (!i ? "NO_EXT" : "START_CONVO") })
				continue;
			}
			if (!Object.keys(user_data_server[`${LINK_ID}-${USER_MAIN}`]).includes(user_data[i])) {
				build_data.push({ user_id: user_data[i], type: "START_CONVO" })
				continue;
			}
			build_data.push({ user_id: user_data[i], type: "CHAT", length: user_data_server[USER_MAIN][user_data[i]].length })
		}

		build_HTML_home(build_data);

		if (build_data.length) button_utils();

		// ws_global_actions("ping");

	})
})

// button functions

function button_utils() {
	document.getElementById("__invite_user_btn__").addEventListener("click", () => {
		const HOME = document.getElementById("__home");
		const INVITE = document.getElementById("__invite_mail");
		HOME.style.display = "none";
		INVITE.style.display = "flex";
	})

	document.getElementById("__invite_mail_return_btn").addEventListener("click", () => {
		const HOME = document.getElementById("__home");
		const INVITE = document.getElementById("__invite_mail");
		HOME.style.display = "block";
		INVITE.style.display = "none";
	})

	document.getElementById("__invite_mail_input_btn").addEventListener("click", async () => {
		const INPUT_ELE = document.getElementById("__invite_mail_input");
		const ERR_ELE = document.getElementById("__invite_mail_input_error");
		if (!!!(INPUT_ELE.value)) {
			ERR_ELE.innerText = "Input must not left empty";
			return;
		}
		const data = await sendMail(INPUT_ELE.value);
		if (data["success"]) {
			document.body.innerHTML = `<div style='color: #84cc16; text-align: center;'>${data["message"]}!!!<div>`;
			return;
		}
		ERR_ELE.innerText = data["message"];
	})

}

/*
// test action
document.getElementById("btn").addEventListener("click", () => {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		chrome.tabs.sendMessage(tabs[0].id, {
			action: "click",
			color: "red"
		});
	})
	WS.send(JSON.stringify({ type: "ping" }));
})
*/
