export function START_CONVO(user_id) {
	return {
		type: "start_convo",
		text: `Hi there ${user_id} 👅`,
		attachments: []
	}
}
