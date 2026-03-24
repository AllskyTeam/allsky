"use strict";

class ALLSKYDASHBOARD {
	constructor() {
		this.#setupEvents();
		this.#setupTheme();
	}

	#setupTheme() {
		if (!localStorage.getItem("theme")) {
			localStorage.setItem("theme", "light")
		}

		$('body').attr('data-bs-theme', localStorage.getItem('theme'));

		$('#theme-toggle').on('change', (e) => {
			if (localStorage.getItem('theme') === 'light') {
				localStorage.setItem('theme', 'dark');
			} else {
				localStorage.setItem('theme', 'light');
			}
			$('body').attr('data-bs-theme', localStorage.getItem('theme'));
		});

	};

	#setupEvents() {
		//$('#theme-toggle').on('change', function () {
    	//	const currentTheme = $('body').attr('data-bs-theme');
    	//	const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    	//	$('body').attr('data-bs-theme', newTheme);
		//});

		$('.js-fullheight').css('height', $(window).height());
		$(window).resize(function () {
			$('.js-fullheight').css('height', $(window).height());
		});

		$('#sidebarCollapse').on('click', function () {
			$('#sidebar').toggleClass('active');
		});

	}
}

$(function () {
	const dashboardClass = new ALLSKYDASHBOARD()
});