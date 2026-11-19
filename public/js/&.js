// & is the name of the proxy page, so &.js is the js for the proxy page minus the actual proxy code, because thats long enough to cause readability issues

let encodedUrl = '';
let navigationId = 0;
let loadTimer;
function finishLoading() {
    clearTimeout(loadTimer);
    document.querySelector('.spinnerParent').style.display = 'none';
    document.querySelector('.spinner').style.display = 'none';
}
function showBrowseError(message) {
    finishLoading();
    document.getElementById('intospace').style.display = 'none';
    const panel = document.getElementById('browseError');
    panel.hidden = false;
    panel.querySelector('p').textContent = message;
}
async function executeSearch(query) {
    if (!query.trim()) return;
    const attempt = ++navigationId;
    document.getElementById('browseError').hidden = true;
    try {
        encodedUrl = swConfigSettings.prefix + __uv$config.encodeUrl(search(query));
        localStorage.setItem('input', query);
        localStorage.setItem('output', encodedUrl);
        document.querySelector('.spinnerParent').style.display = 'block';
        document.querySelector('.spinner').style.display = 'block';
        document.getElementById('gointospace').style.display = 'none';
        document.querySelector('.shortcuts').style.display = 'none';
        document.querySelector('.shortcutsBig').style.display = 'none';
        clearTimeout(loadTimer);
        loadTimer = setTimeout(() => {
            if (attempt === navigationId) showBrowseError('This website is taking too long to respond. Try again or open it in a new tab.');
        }, 30000);
        await registerSW();
        if (attempt !== navigationId) return;
        const frame = document.getElementById('intospace');
        frame.src = encodedUrl;
        frame.style.display = 'block';
        address2.value = search(query);
        document.querySelectorAll('input').forEach(input => input.blur());
    } catch (error) {
        if (attempt === navigationId) showBrowseError(error.message || 'Browsing could not start. Please try again.');
    }
}

let historyArray = [];
try {
    const saved = JSON.parse(localStorage.getItem('historyArray'));
    if (Array.isArray(saved)) historyArray = saved.filter(url => typeof url === 'string' && url.startsWith(location.origin + swConfigSettings.prefix));
} catch { /* Discard malformed browser history so browsing can still start. */ }
let currentIndex = -1;

if (historyArray.length > 0) {
	currentIndex = historyArray.length - 1;
	saveHistory();
}

function saveHistory() {
	localStorage.setItem('historyArray', JSON.stringify(historyArray));
	localStorage.setItem('currentIndex', currentIndex.toString());
}

let urlMonitor;
function startURLMonitoring() {
	if (urlMonitor) return;
	const iframe = document.getElementById('intospace');
	let lastUrl = '';

	const checkIframeURL = () => {
		try {
			const currentUrl = iframe.contentWindow.location.href;
			if (currentUrl.includes(swConfigSettings.prefix) && currentUrl !== lastUrl) {
				lastUrl = currentUrl;

				if (historyArray[currentIndex] !== currentUrl) {
					// if the user navigates while in history, it clears the history after
					historyArray = historyArray.slice(0, currentIndex + 1);
					historyArray.push(currentUrl);
					currentIndex++;
					saveHistory();
				}

				devToggle = false;
				erudaScriptLoaded = false;
				erudaScriptInjecting = false;
				console.log('Iframe navigation detected, Eruda toggle reset.');

				updateGointospace2(currentUrl);
				updateButtonStates();
			}
		} catch (e) {
			console.log('Error getting iframe url:', e);
		}
	};

	urlMonitor = setInterval(checkIframeURL, 250);
}

function updateGointospace2(url) {
	document.querySelectorAll('.search-header__icon')[0].style.display = 'none';

	let cleanedUrl = __uv$config.decodeUrl(
		url.split(swConfigSettings.prefix).pop()
	);

	let isSecure = cleanedUrl.startsWith('https://');

	cleanedUrl = cleanedUrl.replace(/^https?:\/\//, '');

	if (cleanedUrl === 'a`owt8bnalk') {
		address2.value = 'Loading...';
	} else if (__uv$config.decodeUrl(cleanedUrl).endsWith('/500')) {
		address2.value = 'Internal Server Error! Did you load a broken link?';
	} else {
		address2.value = cleanedUrl;
	}

	let webSecurityIcon = document.querySelector('.webSecurityIcon');
	if (isSecure) {
		webSecurityIcon.id = 'secure';
		webSecurityIcon.innerHTML =
			'<span class="material-icons" style="font-size: 20px !important; height: 16px !important; width: 16px !important; padding: 0 !important; background-color: transparent !important;">lock</span>';
	} else {
		webSecurityIcon.id = 'notSecure';
		webSecurityIcon.innerHTML =
			'<span class="material-icons" style="font-size: 20px !important; height: 16px !important; width: 16px !important; padding: 0 !important; background-color: transparent !important;">lock_open</span>';
	}
}

address2.addEventListener('click', function () {
	let currentValue = this.value;

	if (
		!currentValue.startsWith('http://') &&
		!currentValue.startsWith('https://') &&
		intospace.src &&
		currentValue != 'Internal Server Error! Did you load a broken link?' &&
		currentValue != 'Loading...'
	) {
		let isSecure = __uv$config
			.decodeUrl(
				iframe.contentWindow.location.href
					.split(swConfigSettings.prefix)
					.pop()
			)
			.startsWith('https://');
		if (isSecure) {
			this.value = 'https://' + currentValue;
		} else {
			this.value = 'http://' + currentValue;
		}
	}

	this.select();
});

address2.addEventListener('blur', function () {
	let currentValue = this.value;

	if (
		currentValue.startsWith('http://') ||
		currentValue.startsWith('https://')
	) {
		this.value = currentValue.replace(/^https?:\/\//, '');
	}
});

document.querySelector('.utilityBar .search-header__button')?.addEventListener('click', () => executeSearch(address2.value));
const refreshButton = document.querySelector('.refreshButton');
const homeButton = document.querySelector('.homeButton');
const fullscreenButton = document.querySelector('.fullscreenButton');
const backButton = document.querySelector('.backButton');
const forwardButton = document.querySelector('.forwardButton');

refreshButton.addEventListener('click', function () {
	iframe.contentWindow.location.reload();
});

homeButton.addEventListener('click', function () {
	window.location.href = '/&';
});

fullscreenButton.addEventListener('click', () => {
	if (document.fullscreenElement) {
		document.exitFullscreen?.() ||
			document.mozCancelFullScreen?.() ||
			document.webkitExitFullscreen?.() ||
			document.msExitFullscreen?.();
	} else {
		const requestFullscreen = element => {
			element.requestFullscreen?.() ||
				element.mozRequestFullScreen?.() ||
				element.webkitRequestFullscreen?.() ||
				element.msRequestFullscreen?.();
		};

		if (!iframe.src || iframe.src === 'about:blank') {
			requestFullscreen(document.documentElement);
		} else {
			requestFullscreen(iframe);
		}
	}
});

document.addEventListener('fullscreenchange', () => {
	if (!document.fullscreenElement) {
		fullscreenButton.innerText = 'fullscreen';
	} else {
		fullscreenButton.innerText = 'fullscreen_exit';
	}
});

backButton.addEventListener('click', function () {
	if (currentIndex > 0) {
		currentIndex--;
		iframe.src = historyArray[currentIndex];
		iframe.style.display = 'block';
		setTimeout(() => {
			document.getElementById('gointospace2').style.paddingLeft = '40px';
		}, 250);
		updateButtonStates();
		saveHistory();
	}
});

forwardButton.addEventListener('click', function () {
	if (currentIndex < historyArray.length - 1) {
		currentIndex++;
		iframe.src = historyArray[currentIndex];
		iframe.style.display = 'block';
		setTimeout(() => {
			document.getElementById('gointospace2').style.paddingLeft = '40px';
		}, 250);
		updateButtonStates();
		saveHistory();
	}
});

function updateButtonStates() {
	if (currentIndex > 0) {
		backButton.style.opacity = '1';
		backButton.style.cursor = 'pointer';
	} else {
		backButton.style.opacity = '0.5';
		backButton.style.cursor = 'default';
	}

	if (currentIndex < historyArray.length - 1) {
		forwardButton.style.opacity = '1';
		forwardButton.style.cursor = 'pointer';
	} else {
		forwardButton.style.opacity = '0.5';
		forwardButton.style.cursor = 'default';
	}
}
let browserReady;
async function registerSW() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
        throw new Error('Browsing requires HTTPS and a browser with service worker support.');
    }
    if (!browserReady) browserReady = (async () => {
        const registration = await navigator.serviceWorker.register(swFile, {
            scope: swConfigSettings.prefix, updateViaCache: 'none'
        });
        if (!registration.active) await new Promise((resolve, reject) => {
            const worker = registration.installing || registration.waiting;
            if (!worker) return reject(new Error('The browser worker did not start. Reload and try again.'));
            const timer = setTimeout(() => reject(new Error('The browser worker did not activate. Reload and try again.')), 12000);
            function check() {
                if (worker.state === 'activated') { clearTimeout(timer); resolve(); }
                if (worker.state === 'redundant') { clearTimeout(timer); reject(new Error('The browser worker failed to install.')); }
            }
            worker.addEventListener('statechange', check);
            check();
        });
        await setTransports();
    })().catch(error => { browserReady = null; throw error; });
    return browserReady;
}
// register event listeners for shit
if (address1) {
	address1.addEventListener('keydown', function (event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			let query = address1.value;
			executeSearch(query);
		}
	});
}
if (address2) {
	address2.addEventListener('keydown', function (event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			let query = address2.value;
			executeSearch(query);
		}
	});
}
// Make it so that if the user goes to /&?q= it searches it
document.addEventListener('DOMContentLoaded', function () {
	const urlParams = new URLSearchParams(window.location.search);
	const queryParam = urlParams.get('q');
	if (queryParam) {
		Promise.all([
			fetch('/json/g.json').then(response => response.json()),
			fetch('/json/a.json').then(response => response.json()),
			fetch('/json/s.json').then(response => response.json())
		])
			.then(([gData, aData, shortcutsData]) => {
				let data = [];
				let source = '';

				if (
					gData.some(
						d => d.name.toLowerCase() === queryParam.toLowerCase()
					)
				) {
					data = gData;
					source = 'g';
				} else if (
					aData.some(
						d => d.name.toLowerCase() === queryParam.toLowerCase()
					)
				) {
					data = aData;
					source = 'a';
				} else if (
					shortcutsData.some(
						d => d.name.toLowerCase() === queryParam.toLowerCase()
					)
				) {
					data = shortcutsData;
					source = 'shortcuts';
				}

				const item = data.find(
					d => d.name.toLowerCase() === queryParam.toLowerCase()
				);

				if (item) {
					if (source === 'g') {
						document.querySelector('.gPage').id = 'navactive';
					} else if (source === 'a') {
						document.querySelector('.aPage').id = 'navactive';
					} else {
						document.querySelector('.pPage').id = 'navactive';
					}
					executeSearch(item.url);
				} else {
					executeSearch(queryParam);
				}
			})
			.catch(() => executeSearch(queryParam));
		document.querySelector('.utilityBar').style.display = 'block';
		document.getElementById('intospace').style.height = 'calc(100% - 3.633em)';
		document.getElementById('intospace').style.top = '3.633em';
	} else {
		if (localStorage.getItem('utilBarHidden') === 'true') {
			document.querySelector('.utilityBar').style.display = 'none';
			document.getElementById('intospace').style.height = '100%';
		} else {
			document.querySelector('.utilityBar').style.display = 'block';
			document.getElementById('intospace').style.height =
				'calc(100% - 3.633em)';
		}

		document.querySelector('.pPage').id = 'navactive';
	}
	startURLMonitoring();
	updateButtonStates();
	if (localStorage.getItem('smallIcons') === 'false') {
		switch (localStorage.getItem('dropdown-selected-text-searchEngine')) {
			case 'Duck Duck Go':
				document.querySelector('.searchEngineIcon').src =
					'/assets/imgs/b/ddg.webp';
				document.querySelector('.searchEngineIcon').style.transform =
					'scale(1.35)';
				break;
			case 'Bing':
				document.querySelector('.searchEngineIcon').src =
					'/assets/imgs/b/bing.webp';
				document.querySelector('.searchEngineIcon').style.transform =
					'scale(1.65)';
				break;
			case 'Google (default)':
				document.querySelector('.searchEngineIcon').src =
					'/assets/imgs/b/google.webp';
				document.querySelector('.searchEngineIcon').style.transform =
					'scale(1.2)';
				break;
			case 'Yahoo!':
				document.querySelector('.searchEngineIcon').src =
					'/assets/imgs/b/yahoo.webp';
				document.querySelector('.searchEngineIcon').style.transform =
					'scale(1.5)';
				break;
			default:
				document.querySelector('.searchEngineIcon').src =
					'/assets/imgs/b/google.webp';
				document.querySelector('.searchEngineIcon').style.transform =
					'scale(1.2)';
		}
	}
});

const iframe = document.getElementById('intospace');
iframe.addEventListener('load', () => {
    if (!iframe.getAttribute('src')) return;
    finishLoading();
    try {
        const url = iframe.contentWindow.location.href;
        if (url.includes(swConfigSettings.prefix)) updateGointospace2(url);
    } catch { /* Some destinations navigate to another origin. */ }
});
navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data?.type === 'space:load-error' && event.data.url === new URL(encodedUrl, location.origin).href) {
        showBrowseError('The website could not be reached. Try again or open it in a new tab.');
    }
});
iframe.addEventListener('error', () => showBrowseError('The page could not load. Check your connection and try again.'));
document.getElementById('browseRetry').addEventListener('click', () => executeSearch(localStorage.getItem('input') || address2.value));
document.getElementById('browseOpen').addEventListener('click', () => {
    try { window.open(search(localStorage.getItem('input') || address2.value), '_blank', 'noopener,noreferrer'); }
    catch (error) { showBrowseError(error.message); }
});
for (const address of [address1, address2]) {
    address?.closest('form')?.addEventListener('submit', event => {
        event.preventDefault();
        executeSearch(address.value);
    });
}
window.addEventListener('online', () => {
    if (!document.getElementById('browseError').hidden) {
        browserReady = null;
        executeSearch(localStorage.getItem('input') || address2.value);
    }
});

let devToggle = false;
let erudaScriptLoaded = false;
let erudaScriptInjecting = false;

function injectErudaScript(iframeDocument) {
	return new Promise((resolve, reject) => {
		if (erudaScriptLoaded) {
			resolve();
			return;
		}

		if (erudaScriptInjecting) {
			console.warn('Eruda script is already being injected.');
			resolve();
			return;
		}

		erudaScriptInjecting = true;

		const script = iframeDocument.createElement('script');
		script.type = 'text/javascript';
		script.src = 'https://cdn.jsdelivr.net/npm/eruda';
		script.onload = () => {
			erudaScriptLoaded = true;
			erudaScriptInjecting = false;
			resolve();
		};
		script.onerror = event => {
			erudaScriptInjecting = false;
			reject(new Error('Failed to load Eruda script:', event));
		};
		iframeDocument.body.appendChild(script);
	});
}

function injectShowScript(iframeDocument) {
	return new Promise(resolve => {
		const script = iframeDocument.createElement('script');
		script.type = 'text/javascript';
		script.textContent = `
			eruda.init({
				defaults: {
					displaySize: 50,
					transparency: 0.9,
					theme: 'Material Palenight'
				}
			});
			eruda.show();
			document.currentScript.remove();
		`;
		iframeDocument.body.appendChild(script);
		resolve();
	});
}

function injectHideScript(iframeDocument) {
	return new Promise(resolve => {
		const script = iframeDocument.createElement('script');
		script.type = 'text/javascript';
		script.textContent = `
			eruda.hide();
			document.currentScript.remove();
		`;
		iframeDocument.body.appendChild(script);
		resolve();
	});
}

function inspectelement() {
	const iframe = document.getElementById('intospace');
	if (!iframe || !iframe.contentWindow) {
		console.error(
			"Iframe not found or inaccessible. \\(°□°)/ (This shouldn't happen btw)"
		);
		return;
	}

	const iframeDocument = iframe.contentWindow.document;

	const forbiddenSrcs = ['about:blank', null, 'a%60owt8bnalk', 'a`owt8bnalk'];
	if (iframe.contentWindow.location.href.includes(forbiddenSrcs)) {
		console.warn('Iframe src is forbidden, skipping.');
		return;
	}

	if (iframe.contentWindow.document.readyState == 'loading') {
		console.warn(
			'Iframe has not finished loading, skipping Eruda injection. Be patient, jesus fuck.'
		);
		return;
	}

	injectErudaScript(iframeDocument)
		.then(() => {
			if (!devToggle) {
				injectShowScript(iframeDocument);
			} else {
				injectHideScript(iframeDocument);
			}

			devToggle = !devToggle;
		})
		.catch(error => {
			console.error('Error injecting Eruda script:', error);
		});

	iframe.contentWindow.addEventListener('unload', () => {
		devToggle = false;
		erudaScriptLoaded = false;
		erudaScriptInjecting = false;
		console.log('Iframe navigation detected, Eruda toggle reset.');
	});
}
