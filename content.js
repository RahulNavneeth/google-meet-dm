const users_class = '.zWGUib';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	switch (request.action) {
		case 'fetch_users': {
			const user_data = document.querySelectorAll(users_class);
			let users = [];
			user_data.forEach(userElement => users.push(userElement.innerText));
			sendResponse({ users });
			break;
		}
		// test action
		case 'click': {
			document.documentElement.style.grayscale = '100%';
			break;
		}
		default:
			sendResponse({ error: 'Invalid action' });
			break;
	}
	return true;
});
