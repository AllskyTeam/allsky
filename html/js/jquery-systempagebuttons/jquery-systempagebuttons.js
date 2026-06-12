"use strict";

(function ($) {
    class SystemPageEntriesEditor {
        constructor(element) {
            this.$trigger = $(element);
            this.files = [];
            this.configuredFiles = [];
            this.configDir = "";
            this.activePath = "";
            this.editIndex = -1;
            this.$modal = null;
            this.$browserModal = null;
            this.$entryModal = null;
            this.$fileSelect = null;
            this.$newPathInput = null;
            this.$tableBody = null;
            this.$empty = null;
            this.$message = null;
            this.$currentFile = null;
            this.$browserList = null;
            this.$entryType = null;
            this.$errorModal = null;
            this.$resultModal = null;
            this.$iconPickerModal = null;
            this.fontAwesomeIcons = [];
            this.fontAwesomeIconsLoaded = false;
            this.fontAwesomeIconStyleData = null;
            this.bindTrigger();
        }

        getFontAwesomeIconStyleData() {
            if (this.fontAwesomeIconStyleData) {
                return this.fontAwesomeIconStyleData;
            }

            this.fontAwesomeIconStyleData = {
                solid: [
                    "fa-0", "fa-1", "fa-2", "fa-3", "fa-4", "fa-5",
                    "fa-6", "fa-7", "fa-8", "fa-9", "fa-fill-drip", "fa-arrows-to-circle",
                    "fa-circle-chevron-right", "fa-at", "fa-trash-can", "fa-text-height", "fa-user-xmark", "fa-stethoscope",
                    "fa-message", "fa-info", "fa-down-left-and-up-right-to-center", "fa-explosion", "fa-file-text", "fa-wave-square",
                    "fa-ring", "fa-building-un", "fa-dice-three", "fa-calendar-days", "fa-anchor-circle-check", "fa-building-circle-arrow-right",
                    "fa-volleyball-ball", "fa-arrows-up-to-line", "fa-sort-down", "fa-minus-circle", "fa-door-open", "fa-sign-out-alt",
                    "fa-atom", "fa-soap", "fa-icons", "fa-microphone-lines-slash", "fa-bridge-circle-check", "fa-pump-medical",
                    "fa-fingerprint", "fa-hand-point-right", "fa-search-location", "fa-step-forward", "fa-smile-beam", "fa-flag-checkered",
                    "fa-football-ball", "fa-school-circle-exclamation", "fa-crop", "fa-angles-down", "fa-users-rectangle", "fa-people-roof",
                    "fa-people-line", "fa-beer-mug-empty", "fa-diagram-predecessor", "fa-long-arrow-up", "fa-fire-flame-simple", "fa-person",
                    "fa-laptop", "fa-file-csv", "fa-menorah", "fa-truck-plane", "fa-record-vinyl", "fa-grin-stars",
                    "fa-bong", "fa-spaghetti-monster-flying", "fa-arrow-down-up-across-line", "fa-utensil-spoon", "fa-jar-wheat", "fa-mail-bulk",
                    "fa-file-circle-exclamation", "fa-hospital-symbol", "fa-pager", "fa-contact-book", "fa-strikethrough", "fa-k",
                    "fa-landmark-flag", "fa-pencil-alt", "fa-backward", "fa-caret-right", "fa-comments", "fa-paste",
                    "fa-code-pull-request", "fa-clipboard-list", "fa-truck-ramp-box", "fa-user-check", "fa-vial-virus", "fa-sheet-plastic",
                    "fa-blog", "fa-user-ninja", "fa-person-arrow-up-from-line", "fa-torah", "fa-quidditch-broom-ball", "fa-toggle-off",
                    "fa-box-archive", "fa-person-drowning", "fa-sort-numeric-down-alt", "fa-grin-tongue-squint", "fa-spray-can", "fa-truck-monster",
                    "fa-w", "fa-globe-africa", "fa-rainbow", "fa-circle-notch", "fa-tablet-screen-button", "fa-paw",
                    "fa-cloud", "fa-trowel-bricks", "fa-flushed", "fa-hospital-user", "fa-tent-arrow-left-right", "fa-legal",
                    "fa-binoculars", "fa-microphone-slash", "fa-box-tissue", "fa-motorcycle", "fa-concierge-bell", "fa-pencil-ruler",
                    "fa-people-arrows-left-right", "fa-mars-and-venus-burst", "fa-square-caret-right", "fa-scissors", "fa-sun-plant-wilt", "fa-toilets-portable",
                    "fa-hockey-puck", "fa-table", "fa-magnifying-glass-arrow-right", "fa-tachograph-digital", "fa-users-slash", "fa-clover",
                    "fa-reply", "fa-star-and-crescent", "fa-house-fire", "fa-square-minus", "fa-helicopter", "fa-compass",
                    "fa-square-caret-down", "fa-file-circle-question", "fa-laptop-code", "fa-swatchbook", "fa-prescription-bottle", "fa-navicon",
                    "fa-people-group", "fa-hourglass-end", "fa-heart-crack", "fa-square-up-right", "fa-kiss-beam", "fa-film",
                    "fa-ruler-horizontal", "fa-people-robbery", "fa-lightbulb", "fa-caret-left", "fa-exclamation-circle", "fa-school-circle-xmark",
                    "fa-sign-out", "fa-circle-chevron-down", "fa-unlock-keyhole", "fa-cloud-showers-heavy", "fa-headphones-simple", "fa-sitemap",
                    "fa-donate", "fa-memory", "fa-road-spikes", "fa-fire-burner", "fa-flag", "fa-hanukiah",
                    "fa-feather", "fa-volume-low", "fa-comment-slash", "fa-cloud-sun-rain", "fa-compress", "fa-wheat-awn",
                    "fa-ankh", "fa-hands-holding-child", "fa-asterisk", "fa-square-check", "fa-peseta-sign", "fa-heading",
                    "fa-ghost", "fa-list-squares", "fa-square-phone-flip", "fa-cart-plus", "fa-gamepad", "fa-dot-circle",
                    "fa-face-dizzy", "fa-egg", "fa-house-medical-circle-xmark", "fa-campground", "fa-folder-plus", "fa-soccer-ball",
                    "fa-paintbrush", "fa-lock", "fa-gas-pump", "fa-hot-tub-person", "fa-map-marked", "fa-house-flood-water",
                    "fa-tree", "fa-bridge-lock", "fa-sack-dollar", "fa-pen-to-square", "fa-car-side", "fa-share-nodes",
                    "fa-heart-circle-minus", "fa-hourglass-half", "fa-microscope", "fa-sink", "fa-shopping-bag", "fa-sort-alpha-down-alt",
                    "fa-mitten", "fa-person-rays", "fa-users", "fa-eye-slash", "fa-flask-vial", "fa-hand-paper",
                    "fa-om", "fa-worm", "fa-house-circle-xmark", "fa-plug", "fa-chevron-up", "fa-hand-spock",
                    "fa-stopwatch", "fa-kiss", "fa-bridge-circle-xmark", "fa-grin-tongue", "fa-chess-bishop", "fa-grin-wink",
                    "fa-hard-of-hearing", "fa-road-circle-check", "fa-dice-five", "fa-square-rss", "fa-land-mine-on", "fa-i-cursor",
                    "fa-stamp", "fa-stairs", "fa-i", "fa-hryvnia-sign", "fa-pills", "fa-grin-alt",
                    "fa-tooth", "fa-v", "fa-bangladeshi-taka-sign", "fa-bicycle", "fa-staff-snake", "fa-head-side-cough-slash",
                    "fa-truck-medical", "fa-wheat-awn-circle-exclamation", "fa-snowman", "fa-mortar-pestle", "fa-road-barrier", "fa-school",
                    "fa-igloo", "fa-joint", "fa-angle-right", "fa-horse", "fa-q", "fa-g",
                    "fa-notes-medical", "fa-thermometer-half", "fa-dong-sign", "fa-capsules", "fa-poo-storm", "fa-frown-open",
                    "fa-hand-point-up", "fa-money-bill", "fa-bookmark", "fa-align-justify", "fa-umbrella-beach", "fa-helmet-un",
                    "fa-bullseye", "fa-bacon", "fa-hand-point-down", "fa-arrow-up-from-bracket", "fa-folder-blank", "fa-file-waveform",
                    "fa-radiation", "fa-chart-simple", "fa-mars-stroke", "fa-vial", "fa-tachometer-alt-average", "fa-wand-magic-sparkles",
                    "fa-e", "fa-pen-clip", "fa-bridge-circle-exclamation", "fa-user", "fa-school-circle-check", "fa-dumpster",
                    "fa-van-shuttle", "fa-building-user", "fa-square-caret-left", "fa-highlighter", "fa-key", "fa-bullhorn",
                    "fa-globe", "fa-synagogue", "fa-person-half-dress", "fa-road-bridge", "fa-location-arrow", "fa-c",
                    "fa-tablet-button", "fa-building-lock", "fa-pizza-slice", "fa-money-bill-wave", "fa-chart-area", "fa-house-flag",
                    "fa-person-circle-minus", "fa-cancel", "fa-camera-rotate", "fa-spray-can-sparkles", "fa-star", "fa-repeat",
                    "fa-cross", "fa-box", "fa-venus-mars", "fa-mouse-pointer", "fa-maximize", "fa-charging-station",
                    "fa-triangle-circle-square", "fa-shuffle", "fa-running", "fa-mobile-retro", "fa-grip-lines-vertical", "fa-spider",
                    "fa-hands-bound", "fa-file-invoice-dollar", "fa-plane-circle-exclamation", "fa-x-ray", "fa-spell-check", "fa-slash",
                    "fa-mouse", "fa-sign-in", "fa-store-alt-slash", "fa-server", "fa-virus-covid-slash", "fa-shop-lock",
                    "fa-hourglass-start", "fa-blender-phone", "fa-building-wheat", "fa-person-breastfeeding", "fa-sign-in-alt", "fa-venus",
                    "fa-passport", "fa-thumbtack-slash", "fa-heartbeat", "fa-people-carry-box", "fa-temperature-high", "fa-microchip",
                    "fa-crown", "fa-weight-hanging", "fa-xmarks-lines", "fa-file-prescription", "fa-weight-scale", "fa-user-group",
                    "fa-sort-alpha-up", "fa-chess-knight", "fa-laugh-squint", "fa-wheelchair", "fa-circle-arrow-up", "fa-toggle-on",
                    "fa-walking", "fa-l", "fa-fire", "fa-procedures", "fa-space-shuttle", "fa-laugh",
                    "fa-folder-open", "fa-heart-circle-plus", "fa-code-fork", "fa-city", "fa-microphone-lines", "fa-pepper-hot",
                    "fa-unlock", "fa-colon-sign", "fa-headset", "fa-store-slash", "fa-road-circle-xmark", "fa-user-minus",
                    "fa-mars-stroke-v", "fa-glass-cheers", "fa-clipboard", "fa-house-circle-exclamation", "fa-file-upload", "fa-wifi-strong",
                    "fa-bathtub", "fa-underline", "fa-user-pen", "fa-signature", "fa-stroopwafel", "fa-bold",
                    "fa-anchor-lock", "fa-building-ngo", "fa-manat-sign", "fa-not-equal", "fa-border-top-left", "fa-map-marked-alt",
                    "fa-jedi", "fa-square-poll-vertical", "fa-mug-hot", "fa-car-battery", "fa-gift", "fa-dice-two",
                    "fa-chess-queen", "fa-glasses", "fa-chess-board", "fa-building-circle-check", "fa-person-chalkboard", "fa-mars-stroke-right",
                    "fa-hand-rock", "fa-square-caret-up", "fa-cloud-showers-water", "fa-chart-bar", "fa-hands-wash", "fa-less-than-equal",
                    "fa-train", "fa-low-vision", "fa-crow", "fa-sailboat", "fa-window-restore", "fa-square-plus",
                    "fa-torii-gate", "fa-frog", "fa-bucket", "fa-image", "fa-microphone", "fa-cow",
                    "fa-caret-up", "fa-screwdriver", "fa-folder-closed", "fa-house-tsunami", "fa-square-nfi", "fa-arrow-up-from-ground-water",
                    "fa-martini-glass", "fa-square-binary", "fa-undo-alt", "fa-table-columns", "fa-lemon", "fa-head-side-mask",
                    "fa-handshake", "fa-gem", "fa-dolly-box", "fa-smoking", "fa-minimize", "fa-monument",
                    "fa-snowplow", "fa-angles-right", "fa-cannabis", "fa-play-circle", "fa-tablets", "fa-ethernet",
                    "fa-euro-sign", "fa-chair", "fa-circle-check", "fa-stop-circle", "fa-drafting-compass", "fa-plate-wheat",
                    "fa-icicles", "fa-person-shelter", "fa-neuter", "fa-id-badge", "fa-marker", "fa-laugh-beam",
                    "fa-helicopter-symbol", "fa-universal-access", "fa-circle-chevron-up", "fa-lari-sign", "fa-volcano", "fa-person-walking-dashed-line-arrow-right",
                    "fa-sterling-sign", "fa-viruses", "fa-square-person-confined", "fa-user-tie", "fa-long-arrow-down", "fa-tent-arrow-down-to-line",
                    "fa-certificate", "fa-reply-all", "fa-suitcase", "fa-skating", "fa-funnel-dollar", "fa-camera-retro",
                    "fa-circle-arrow-down", "fa-file-import", "fa-square-arrow-up-right", "fa-box-open", "fa-scroll", "fa-spa",
                    "fa-location-pin-lock", "fa-pause", "fa-hill-avalanche", "fa-thermometer-empty", "fa-bomb", "fa-registered",
                    "fa-vcard", "fa-scale-unbalanced-flip", "fa-subscript", "fa-directions", "fa-burst", "fa-laptop-house",
                    "fa-tired", "fa-money-bills", "fa-smog", "fa-crutch", "fa-cloud-upload-alt", "fa-palette",
                    "fa-arrows-turn-right", "fa-vest", "fa-ferry", "fa-arrows-down-to-people", "fa-sprout", "fa-left-right",
                    "fa-boxes-packing", "fa-circle-arrow-left", "fa-group-arrows-rotate", "fa-bowl-food", "fa-candy-cane", "fa-sort-amount-down",
                    "fa-thunderstorm", "fa-text-slash", "fa-smile-wink", "fa-file-word", "fa-file-powerpoint", "fa-arrows-left-right",
                    "fa-house-lock", "fa-cloud-download-alt", "fa-children", "fa-chalkboard", "fa-user-large-slash", "fa-envelope-open",
                    "fa-handshake-simple-slash", "fa-mattress-pillow", "fa-guarani-sign", "fa-sync", "fa-fire-extinguisher", "fa-cruzeiro-sign",
                    "fa-greater-than-equal", "fa-shield-halved", "fa-book-atlas", "fa-virus", "fa-envelope-circle-check", "fa-layer-group",
                    "fa-arrows-to-dot", "fa-archway", "fa-heart-circle-check", "fa-house-damage", "fa-file-zipper", "fa-square",
                    "fa-martini-glass-empty", "fa-couch", "fa-cedi-sign", "fa-italic", "fa-table-cells-column-lock", "fa-church",
                    "fa-comments-dollar", "fa-democrat", "fa-z", "fa-skiing", "fa-road-lock", "fa-a",
                    "fa-temperature-down", "fa-feather-pointed", "fa-p", "fa-snowflake", "fa-newspaper", "fa-rectangle-ad",
                    "fa-circle-arrow-right", "fa-filter-circle-xmark", "fa-locust", "fa-unsorted", "fa-list-ol", "fa-person-dress-burst",
                    "fa-money-check-dollar", "fa-vector-square", "fa-bread-slice", "fa-language", "fa-kiss-wink-heart", "fa-filter",
                    "fa-question", "fa-file-signature", "fa-up-down-left-right", "fa-house-chimney-user", "fa-hand-holding-heart", "fa-puzzle-piece",
                    "fa-money-check", "fa-star-half-stroke", "fa-code", "fa-whiskey-glass", "fa-building-circle-exclamation", "fa-magnifying-glass-chart",
                    "fa-external-link", "fa-cubes-stacked", "fa-won-sign", "fa-virus-covid", "fa-austral-sign", "fa-f",
                    "fa-leaf", "fa-road", "fa-taxi", "fa-person-circle-plus", "fa-pie-chart", "fa-bolt-lightning",
                    "fa-sack-xmark", "fa-file-excel", "fa-file-contract", "fa-fish-fins", "fa-building-flag", "fa-grin-beam",
                    "fa-object-ungroup", "fa-poop", "fa-map-marker", "fa-kaaba", "fa-toilet-paper", "fa-helmet-safety",
                    "fa-eject", "fa-circle-right", "fa-plane-circle-check", "fa-meh-rolling-eyes", "fa-object-group", "fa-line-chart",
                    "fa-mask-ventilator", "fa-arrow-right", "fa-signs-post", "fa-cash-register", "fa-person-circle-question", "fa-h",
                    "fa-tarp", "fa-tools", "fa-arrows-to-eye", "fa-plug-circle-bolt", "fa-heart", "fa-mars-and-venus",
                    "fa-house-user", "fa-dumpster-fire", "fa-house-crack", "fa-martini-glass-citrus", "fa-surprise", "fa-bottle-water",
                    "fa-pause-circle", "fa-toilet-paper-slash", "fa-apple-whole", "fa-kitchen-set", "fa-r", "fa-thermometer-quarter",
                    "fa-cube", "fa-bitcoin-sign", "fa-shield-dog", "fa-solar-panel", "fa-lock-open", "fa-elevator",
                    "fa-money-bill-transfer", "fa-money-bill-trend-up", "fa-house-flood-water-circle-arrow-right", "fa-square-poll-horizontal", "fa-circle", "fa-fast-backward",
                    "fa-recycle", "fa-user-astronaut", "fa-plane-slash", "fa-trademark", "fa-basketball-ball", "fa-satellite-dish",
                    "fa-circle-up", "fa-mobile-screen-button", "fa-volume-up", "fa-users-rays", "fa-wallet", "fa-clipboard-check",
                    "fa-file-audio", "fa-hamburger", "fa-wrench", "fa-bugs", "fa-rupee-sign", "fa-file-image",
                    "fa-question-circle", "fa-plane-departure", "fa-handshake-slash", "fa-book-bookmark", "fa-code-branch", "fa-hat-cowboy",
                    "fa-bridge", "fa-phone-flip", "fa-truck-front", "fa-cat", "fa-anchor-circle-exclamation", "fa-truck-field",
                    "fa-route", "fa-clipboard-question", "fa-panorama", "fa-comment-medical", "fa-teeth-open", "fa-file-circle-minus",
                    "fa-tags", "fa-wine-glass", "fa-forward-fast", "fa-meh-blank", "fa-square-parking", "fa-house-signal",
                    "fa-tasks-alt", "fa-faucet-drip", "fa-dolly-flatbed", "fa-smoking-ban", "fa-terminal", "fa-mobile-button",
                    "fa-house-medical-flag", "fa-shopping-basket", "fa-tape", "fa-bus-simple", "fa-eye", "fa-sad-cry",
                    "fa-audio-description", "fa-person-military-to-person", "fa-file-shield", "fa-user-slash", "fa-pen", "fa-tower-observation",
                    "fa-file-code", "fa-signal-perfect", "fa-bus", "fa-heart-circle-xmark", "fa-house-chimney", "fa-window-maximize",
                    "fa-frown", "fa-prescription", "fa-store-alt", "fa-save", "fa-vihara", "fa-scale-unbalanced",
                    "fa-sort-up", "fa-commenting", "fa-plant-wilt", "fa-diamond", "fa-grin-squint", "fa-hand-holding-usd",
                    "fa-chart-diagram", "fa-bacterium", "fa-hand-pointer", "fa-drum-steelpan", "fa-hand-scissors", "fa-praying-hands",
                    "fa-redo", "fa-biohazard", "fa-location-crosshairs", "fa-mars-double", "fa-child-dress", "fa-users-between-lines",
                    "fa-lungs-virus", "fa-grin-tears", "fa-phone", "fa-calendar-xmark", "fa-child-reaching", "fa-head-side-virus",
                    "fa-user-gear", "fa-sort-numeric-up", "fa-door-closed", "fa-shield-virus", "fa-dice-six", "fa-mosquito-net",
                    "fa-file-fragment", "fa-bridge-water", "fa-person-booth", "fa-text-width", "fa-hat-wizard", "fa-pen-fancy",
                    "fa-person-digging", "fa-trash", "fa-tachometer-average", "fa-book-medical", "fa-poo", "fa-quote-right-alt",
                    "fa-tshirt", "fa-cubes", "fa-divide", "fa-tenge-sign", "fa-headphones", "fa-hands-holding",
                    "fa-hands-clapping", "fa-republican", "fa-arrow-left", "fa-person-circle-xmark", "fa-ruler", "fa-align-left",
                    "fa-dice-d6", "fa-restroom", "fa-j", "fa-users-viewfinder", "fa-file-video", "fa-up-right-from-square",
                    "fa-th", "fa-file-pdf", "fa-book-bible", "fa-o", "fa-suitcase-medical", "fa-user-secret",
                    "fa-otter", "fa-person-dress", "fa-comment-dollar", "fa-business-time", "fa-th-large", "fa-tanakh",
                    "fa-volume-control-phone", "fa-hat-cowboy-side", "fa-clipboard-user", "fa-child", "fa-lira-sign", "fa-satellite",
                    "fa-plane-lock", "fa-tag", "fa-comment", "fa-cake-candles", "fa-envelope", "fa-angles-up",
                    "fa-paperclip", "fa-arrow-right-to-city", "fa-ribbon", "fa-lungs", "fa-sort-numeric-up-alt", "fa-litecoin-sign",
                    "fa-border-none", "fa-circle-nodes", "fa-parachute-box", "fa-indent", "fa-truck-field-un", "fa-hourglass-empty",
                    "fa-mountain", "fa-user-md", "fa-info-circle", "fa-cloud-meatball", "fa-camera-alt", "fa-square-virus",
                    "fa-meteor", "fa-car-on", "fa-sleigh", "fa-sort-numeric-down", "fa-hand-holding-water", "fa-water",
                    "fa-calendar-check", "fa-braille", "fa-prescription-bottle-medical", "fa-landmark", "fa-truck", "fa-crosshairs",
                    "fa-person-cane", "fa-tent", "fa-vest-patches", "fa-check-double", "fa-sort-alpha-down", "fa-money-bill-wheat",
                    "fa-cookie", "fa-undo", "fa-hdd", "fa-grin-squint-tears", "fa-dumbbell", "fa-rectangle-list",
                    "fa-tarp-droplet", "fa-house-medical-circle-check", "fa-skiing-nordic", "fa-calendar-plus", "fa-plane-arrival", "fa-circle-left",
                    "fa-train-subway", "fa-chart-gantt", "fa-inr", "fa-crop-simple", "fa-money-bill-alt", "fa-long-arrow-alt-left",
                    "fa-dna", "fa-virus-slash", "fa-subtract", "fa-chess", "fa-long-arrow-left", "fa-plug-circle-check",
                    "fa-street-view", "fa-franc-sign", "fa-volume-off", "fa-hands-asl-interpreting", "fa-gear", "fa-tint-slash",
                    "fa-mosque", "fa-mosquito", "fa-star-of-david", "fa-person-military-rifle", "fa-shopping-cart", "fa-vials",
                    "fa-plug-circle-plus", "fa-place-of-worship", "fa-grip-vertical", "fa-hexagon-nodes", "fa-level-up", "fa-u",
                    "fa-square-root-variable", "fa-clock-four", "fa-step-backward", "fa-pallet", "fa-faucet", "fa-baseball-bat-ball",
                    "fa-s", "fa-timeline", "fa-keyboard", "fa-caret-down", "fa-house-chimney-medical", "fa-thermometer-three-quarters",
                    "fa-mobile-screen", "fa-plane-up", "fa-piggy-bank", "fa-battery-half", "fa-mountain-city", "fa-coins",
                    "fa-khanda", "fa-sliders-h", "fa-folder-tree", "fa-network-wired", "fa-map-pin", "fa-hamsa",
                    "fa-cent-sign", "fa-flask", "fa-person-pregnant", "fa-wand-sparkles", "fa-ellipsis-vertical", "fa-ticket",
                    "fa-power-off", "fa-right-long", "fa-flag-usa", "fa-laptop-file", "fa-tty", "fa-diagram-next",
                    "fa-person-rifle", "fa-house-medical-circle-exclamation", "fa-closed-captioning", "fa-person-hiking", "fa-venus-double", "fa-images",
                    "fa-calculator", "fa-people-pulling", "fa-n", "fa-tram", "fa-cloud-rain", "fa-building-circle-xmark",
                    "fa-ship", "fa-arrows-down-to-line", "fa-download", "fa-grin", "fa-delete-left", "fa-eyedropper",
                    "fa-file-circle-check", "fa-forward", "fa-mobile-phone", "fa-meh", "fa-align-center", "fa-book-skull",
                    "fa-id-card", "fa-outdent", "fa-heart-circle-exclamation", "fa-house", "fa-calendar-week", "fa-laptop-medical",
                    "fa-b", "fa-file-medical", "fa-dice-one", "fa-kiwi-bird", "fa-exchange", "fa-rotate-right",
                    "fa-utensils", "fa-sort-amount-up", "fa-mill-sign", "fa-bowl-rice", "fa-skull", "fa-tower-broadcast",
                    "fa-truck-pickup", "fa-up-long", "fa-stop", "fa-code-merge", "fa-upload", "fa-hurricane",
                    "fa-mound", "fa-toilet-portable", "fa-compact-disc", "fa-file-download", "fa-caravan", "fa-shield-cat",
                    "fa-zap", "fa-glass-water", "fa-oil-well", "fa-vault", "fa-mars", "fa-toilet",
                    "fa-plane-circle-xmark", "fa-yen-sign", "fa-ruble-sign", "fa-sun", "fa-guitar", "fa-laugh-wink",
                    "fa-horse-head", "fa-bore-hole", "fa-industry", "fa-circle-down", "fa-arrows-turn-to-dots", "fa-florin-sign",
                    "fa-sort-amount-down-alt", "fa-less-than", "fa-angle-down", "fa-car-tunnel", "fa-head-side-cough", "fa-grip-lines",
                    "fa-thumbs-down", "fa-user-lock", "fa-long-arrow-right", "fa-anchor-circle-xmark", "fa-ellipsis-h", "fa-chess-pawn",
                    "fa-kit-medical", "fa-person-through-window", "fa-toolbox", "fa-hands-holding-circle", "fa-bug", "fa-credit-card-alt",
                    "fa-car", "fa-hand-holding-hand", "fa-book-reader", "fa-mountain-sun", "fa-arrows-left-right-to-line", "fa-dice-d20",
                    "fa-truck-droplet", "fa-file-circle-xmark", "fa-temperature-up", "fa-medal", "fa-bed", "fa-square-h",
                    "fa-podcast", "fa-thermometer-full", "fa-bell", "fa-superscript", "fa-plug-circle-xmark", "fa-star-of-life",
                    "fa-phone-slash", "fa-paint-roller", "fa-handshake-angle", "fa-map-marker-alt", "fa-file", "fa-greater-than",
                    "fa-swimmer", "fa-arrow-down", "fa-tint", "fa-eraser", "fa-globe-americas", "fa-person-burst",
                    "fa-dove", "fa-battery-empty", "fa-socks", "fa-inbox", "fa-section", "fa-tachometer-alt-fast",
                    "fa-envelope-open-text", "fa-hospital-wide", "fa-wine-bottle", "fa-chess-rook", "fa-stream", "fa-dharmachakra",
                    "fa-hotdog", "fa-person-walking-with-cane", "fa-drum", "fa-ice-cream", "fa-heart-circle-bolt", "fa-fax",
                    "fa-paragraph", "fa-vote-yea", "fa-star-half", "fa-boxes-stacked", "fa-link", "fa-ear-listen",
                    "fa-tree-city", "fa-play", "fa-font", "fa-table-cells-row-lock", "fa-rupiah-sign", "fa-search",
                    "fa-table-tennis-paddle-ball", "fa-person-dots-from-line", "fa-trash-restore-alt", "fa-naira-sign", "fa-cart-arrow-down", "fa-walkie-talkie",
                    "fa-file-pen", "fa-receipt", "fa-square-pen", "fa-suitcase-rolling", "fa-person-circle-exclamation", "fa-chevron-down",
                    "fa-battery-full", "fa-skull-crossbones", "fa-code-compare", "fa-list-ul", "fa-school-lock", "fa-tower-cell",
                    "fa-long-arrow-alt-down", "fa-ranking-star", "fa-chess-king", "fa-person-harassing", "fa-brazilian-real-sign", "fa-landmark-dome",
                    "fa-arrow-up", "fa-tv-alt", "fa-shrimp", "fa-tasks", "fa-jug-detergent", "fa-user-circle",
                    "fa-user-shield", "fa-wind", "fa-car-crash", "fa-y", "fa-snowboarding", "fa-truck-fast",
                    "fa-fish", "fa-user-graduate", "fa-circle-half-stroke", "fa-clapperboard", "fa-radiation-alt", "fa-baseball-ball",
                    "fa-jet-fighter-up", "fa-project-diagram", "fa-copy", "fa-volume-xmark", "fa-hand-sparkles", "fa-grip-horizontal",
                    "fa-share-square", "fa-child-rifle", "fa-gun", "fa-square-phone", "fa-plus", "fa-expand",
                    "fa-computer", "fa-xmark", "fa-arrows-up-down-left-right", "fa-chalkboard-user", "fa-peso-sign", "fa-building-shield",
                    "fa-baby", "fa-users-line", "fa-quote-left-alt", "fa-tractor", "fa-trash-restore", "fa-arrow-down-up-lock",
                    "fa-lines-leaning", "fa-ruler-combined", "fa-copyright", "fa-equals", "fa-blender", "fa-teeth",
                    "fa-sheqel-sign", "fa-map", "fa-rocket", "fa-photo-video", "fa-folder-minus", "fa-hexagon-nodes-bolt",
                    "fa-store", "fa-arrow-trend-up", "fa-plug-circle-minus", "fa-sign-hanging", "fa-bezier-curve", "fa-bell-slash",
                    "fa-tablet-android", "fa-school-flag", "fa-fill", "fa-angle-up", "fa-drumstick-bite", "fa-holly-berry",
                    "fa-chevron-left", "fa-bacteria", "fa-hand-lizard", "fa-notdef", "fa-disease", "fa-briefcase-medical",
                    "fa-genderless", "fa-chevron-right", "fa-retweet", "fa-car-rear", "fa-pump-soap", "fa-video-slash",
                    "fa-battery-quarter", "fa-radio", "fa-carriage-baby", "fa-traffic-light", "fa-thermometer", "fa-vr-cardboard",
                    "fa-hand-middle-finger", "fa-percentage", "fa-truck-moving", "fa-glass-water-droplet", "fa-display", "fa-smile",
                    "fa-thumbtack", "fa-trophy", "fa-pray", "fa-hammer", "fa-hand-peace", "fa-sync-alt",
                    "fa-spinner", "fa-robot", "fa-peace", "fa-gears", "fa-warehouse", "fa-arrow-up-right-dots",
                    "fa-splotch", "fa-grin-hearts", "fa-dice-four", "fa-sim-card", "fa-transgender-alt", "fa-mercury",
                    "fa-level-down", "fa-person-falling-burst", "fa-award", "fa-ticket-simple", "fa-building", "fa-angles-left",
                    "fa-qrcode", "fa-history", "fa-grin-beam-sweat", "fa-file-export", "fa-shield-blank", "fa-sort-amount-up-alt",
                    "fa-comment-nodes", "fa-house-medical", "fa-golf-ball-tee", "fa-circle-chevron-left", "fa-house-chimney-window", "fa-pen-nib",
                    "fa-tent-arrow-turn-left", "fa-tents", "fa-wand-magic", "fa-dog", "fa-carrot", "fa-moon",
                    "fa-wine-glass-empty", "fa-cheese", "fa-yin-yang", "fa-music", "fa-code-commit", "fa-temperature-low",
                    "fa-person-biking", "fa-broom", "fa-shield-heart", "fa-gopuram", "fa-globe-oceania", "fa-xmark-square",
                    "fa-hashtag", "fa-up-right-and-down-left-from-center", "fa-oil-can", "fa-t", "fa-hippo", "fa-chart-column",
                    "fa-infinity", "fa-vial-circle-check", "fa-person-arrow-down-to-line", "fa-voicemail", "fa-fan", "fa-person-walking-luggage",
                    "fa-up-down", "fa-cloud-moon-rain", "fa-calendar", "fa-trailer", "fa-haykal", "fa-sd-card",
                    "fa-dragon", "fa-shoe-prints", "fa-plus-circle", "fa-grin-tongue-wink", "fa-hand-holding", "fa-plug-circle-exclamation",
                    "fa-unlink", "fa-clone", "fa-person-walking-arrow-loop-left", "fa-sort-alpha-up-alt", "fa-fire-flame-curved", "fa-tornado",
                    "fa-file-circle-plus", "fa-quran", "fa-anchor", "fa-border-all", "fa-face-angry", "fa-cookie-bite",
                    "fa-arrow-trend-down", "fa-rss", "fa-draw-polygon", "fa-scale-balanced", "fa-tachometer-fast", "fa-shower",
                    "fa-desktop-alt", "fa-m", "fa-th-list", "fa-sms", "fa-book", "fa-user-plus",
                    "fa-check", "fa-battery-three-quarters", "fa-house-circle-check", "fa-angle-left", "fa-diagram-successor", "fa-truck-arrow-right",
                    "fa-arrows-split-up-and-left", "fa-hand-fist", "fa-cloud-moon", "fa-briefcase", "fa-person-falling", "fa-portrait",
                    "fa-user-tag", "fa-rug", "fa-globe-europe", "fa-luggage-cart", "fa-window-close", "fa-baht-sign",
                    "fa-book-open", "fa-journal-whills", "fa-handcuffs", "fa-warning", "fa-database", "fa-share",
                    "fa-bottle-droplet", "fa-mask-face", "fa-hill-rockslide", "fa-right-left", "fa-paper-plane", "fa-road-circle-exclamation",
                    "fa-dungeon", "fa-align-right", "fa-money-bill-wave-alt", "fa-life-ring", "fa-signing", "fa-calendar-day",
                    "fa-water-ladder", "fa-arrows-v", "fa-grimace", "fa-wheelchair-move", "fa-turn-down", "fa-person-walking-arrow-right",
                    "fa-square-envelope", "fa-dice", "fa-bowling-ball", "fa-brain", "fa-bandage", "fa-calendar-minus",
                    "fa-xmark-circle", "fa-gifts", "fa-hotel", "fa-globe-asia", "fa-id-card-clip", "fa-search-plus",
                    "fa-thumbs-up", "fa-user-clock", "fa-hand-dots", "fa-file-invoice", "fa-window-minimize", "fa-mug-saucer",
                    "fa-brush", "fa-file-half-dashed", "fa-mask", "fa-search-minus", "fa-ruler-vertical", "fa-user-large",
                    "fa-train-tram", "fa-user-nurse", "fa-syringe", "fa-cloud-sun", "fa-stopwatch-20", "fa-square-full",
                    "fa-magnet", "fa-jar", "fa-sticky-note", "fa-bug-slash", "fa-arrow-up-from-water-pump", "fa-bone",
                    "fa-table-cells-row-unlock", "fa-user-injured", "fa-sad-tear", "fa-plane", "fa-tent-arrows-down", "fa-exclamation",
                    "fa-arrows-spin", "fa-print", "fa-turkish-lira-sign", "fa-usd", "fa-x", "fa-search-dollar",
                    "fa-users-gear", "fa-person-military-pointing", "fa-university", "fa-umbrella", "fa-trowel", "fa-d",
                    "fa-stapler", "fa-theater-masks", "fa-kip-sign", "fa-hand-point-left", "fa-handshake-simple", "fa-jet-fighter",
                    "fa-square-share-nodes", "fa-barcode", "fa-plus-minus", "fa-video-camera", "fa-mortar-board", "fa-hand-holding-medical",
                    "fa-person-circle-check", "fa-turn-up"
                ],
                regular: [
                    "fa-user", "fa-image", "fa-envelope", "fa-star", "fa-heart", "fa-circle-xmark",
                    "fa-comment", "fa-face-smile", "fa-calendar-days", "fa-file", "fa-bell",
                    "fa-clipboard", "fa-circle-user", "fa-circle-up", "fa-circle-down", "fa-bookmark",
                    "fa-pen-to-square", "fa-share-from-square", "fa-eye", "fa-eye-slash", "fa-hand",
                    "fa-folder", "fa-folder-open", "fa-thumbs-up", "fa-thumbs-down", "fa-comments",
                    "fa-lemon", "fa-paper-plane", "fa-compass", "fa-address-book", "fa-handshake",
                    "fa-snowflake", "fa-sun", "fa-calendar", "fa-clock", "fa-circle", "fa-credit-card",
                    "fa-copy", "fa-square", "fa-newspaper", "fa-building", "fa-flag", "fa-file-excel",
                    "fa-hand-point-up", "fa-address-card", "fa-registered", "fa-moon", "fa-file-word",
                    "fa-closed-captioning", "fa-file-pdf", "fa-hospital", "fa-square-check",
                    "fa-copyright", "fa-circle-check", "fa-square-minus", "fa-lightbulb",
                    "fa-keyboard", "fa-clone", "fa-images", "fa-window-restore", "fa-window-minimize",
                    "fa-window-maximize", "fa-trash-can", "fa-star-half-stroke", "fa-star-half",
                    "fa-square-plus", "fa-square-full", "fa-square-caret-up", "fa-square-caret-right",
                    "fa-square-caret-left", "fa-square-caret-down", "fa-rectangle-xmark",
                    "fa-rectangle-list", "fa-paste", "fa-object-ungroup", "fa-object-group",
                    "fa-note-sticky", "fa-money-bill-1", "fa-message", "fa-map", "fa-life-ring",
                    "fa-id-card", "fa-id-badge", "fa-hourglass-half", "fa-hourglass", "fa-hard-drive",
                    "fa-hand-spock", "fa-hand-scissors", "fa-hand-pointer", "fa-hand-point-right",
                    "fa-hand-point-left", "fa-hand-point-down", "fa-hand-peace", "fa-hand-lizard",
                    "fa-hand-back-fist", "fa-gem", "fa-futbol", "fa-font-awesome",
                    "fa-folder-closed", "fa-floppy-disk", "fa-file-zipper", "fa-file-video",
                    "fa-file-powerpoint", "fa-file-lines", "fa-file-image", "fa-file-code",
                    "fa-file-audio", "fa-face-tired", "fa-face-surprise", "fa-face-smile-wink",
                    "fa-face-smile-beam", "fa-face-sad-tear", "fa-face-sad-cry",
                    "fa-face-rolling-eyes", "fa-face-meh-blank", "fa-face-meh",
                    "fa-face-laugh-wink", "fa-face-laugh-squint", "fa-face-laugh-beam",
                    "fa-face-laugh", "fa-face-kiss-wink-heart", "fa-face-kiss-beam",
                    "fa-face-kiss", "fa-face-grin-wink", "fa-face-grin-wide",
                    "fa-face-grin-tongue-wink", "fa-face-grin-tongue-squint",
                    "fa-face-grin-tongue", "fa-face-grin-tears", "fa-face-grin-stars",
                    "fa-face-grin-squint-tears", "fa-face-grin-squint", "fa-face-grin-hearts",
                    "fa-face-grin-beam-sweat", "fa-face-grin-beam", "fa-face-grin",
                    "fa-face-grimace", "fa-face-frown-open", "fa-face-frown",
                    "fa-face-flushed", "fa-face-dizzy", "fa-face-angry", "fa-envelope-open",
                    "fa-comment-dots", "fa-circle-stop", "fa-circle-right", "fa-circle-question",
                    "fa-circle-play", "fa-circle-pause", "fa-circle-left", "fa-circle-dot",
                    "fa-chess-rook", "fa-chess-queen", "fa-chess-pawn", "fa-chess-knight",
                    "fa-chess-king", "fa-chess-bishop", "fa-chart-bar", "fa-calendar-xmark",
                    "fa-calendar-plus", "fa-calendar-minus", "fa-calendar-check", "fa-bell-slash"
                ],
                brands: [
                    "fa-monero", "fa-hooli", "fa-yelp", "fa-cc-visa", "fa-lastfm", "fa-shopware",
                    "fa-creative-commons-nc", "fa-aws", "fa-redhat", "fa-yoast", "fa-cloudflare", "fa-ups",
                    "fa-pixiv", "fa-wpexplorer", "fa-dyalog", "fa-bity", "fa-stackpath", "fa-buysellads",
                    "fa-first-order", "fa-modx", "fa-guilded", "fa-vnv", "fa-square-js", "fa-microsoft",
                    "fa-qq", "fa-orcid", "fa-java", "fa-invision", "fa-creative-commons-pd-alt", "fa-centercode",
                    "fa-glide-g", "fa-drupal", "fa-jxl", "fa-dart-lang", "fa-hire-a-helper", "fa-creative-commons-by",
                    "fa-unity", "fa-whmcs", "fa-rocketchat", "fa-vk", "fa-untappd", "fa-mailchimp",
                    "fa-css3-alt", "fa-square-reddit", "fa-vimeo-v", "fa-contao", "fa-square-font-awesome", "fa-deskpro",
                    "fa-brave", "fa-sistrix", "fa-square-instagram", "fa-battle-net", "fa-the-red-yeti", "fa-square-hacker-news",
                    "fa-edge", "fa-threads", "fa-napster", "fa-square-snapchat", "fa-google-plus-g", "fa-artstation",
                    "fa-markdown", "fa-sourcetree", "fa-google-plus", "fa-diaspora", "fa-foursquare", "fa-stack-overflow",
                    "fa-github-alt", "fa-phoenix-squadron", "fa-pagelines", "fa-algolia", "fa-red-river", "fa-creative-commons-sa",
                    "fa-safari", "fa-google", "fa-square-font-awesome-stroke", "fa-atlassian", "fa-linkedin-in", "fa-digital-ocean",
                    "fa-nimblr", "fa-chromecast", "fa-evernote", "fa-hacker-news", "fa-creative-commons-sampling", "fa-adversal",
                    "fa-creative-commons", "fa-watchman-monitoring", "fa-fonticons", "fa-weixin", "fa-shirtsinbulk", "fa-codepen",
                    "fa-git-alt", "fa-lyft", "fa-rev", "fa-windows", "fa-wizards-of-the-coast", "fa-viadeo-square",
                    "fa-meetup", "fa-centos", "fa-adn", "fa-cloudsmith", "fa-opensuse", "fa-pied-piper-alt",
                    "fa-square-dribbble", "fa-codiepie", "fa-node", "fa-mix", "fa-steam", "fa-cc-apple-pay",
                    "fa-scribd", "fa-debian", "fa-openid", "fa-instalod", "fa-files-pinwheel", "fa-expeditedssl",
                    "fa-sellcast", "fa-twitter-square", "fa-r-project", "fa-delicious", "fa-freebsd", "fa-vuejs",
                    "fa-accusoft", "fa-ioxhost", "fa-fonticons-fi", "fa-app-store", "fa-cc-mastercard", "fa-itunes-note",
                    "fa-golang", "fa-square-kickstarter", "fa-grav", "fa-weibo", "fa-uncharted", "fa-firstdraft",
                    "fa-youtube-square", "fa-wikipedia-w", "fa-wpressr", "fa-angellist", "fa-galactic-republic", "fa-nfc-directional",
                    "fa-skype", "fa-joget", "fa-fedora", "fa-stripe-s", "fa-meta", "fa-laravel",
                    "fa-hotjar", "fa-bluetooth-b", "fa-square-letterboxd", "fa-sticker-mule", "fa-creative-commons-zero", "fa-hips",
                    "fa-css", "fa-behance", "fa-reddit", "fa-discord", "fa-chrome", "fa-app-store-ios",
                    "fa-cc-discover", "fa-wpbeginner", "fa-confluence", "fa-shoelace", "fa-mdb", "fa-dochub",
                    "fa-accessible-icon", "fa-ebay", "fa-amazon", "fa-unsplash", "fa-yarn", "fa-steam-square",
                    "fa-500px", "fa-vimeo-square", "fa-asymmetrik", "fa-font-awesome-logo-full", "fa-gratipay", "fa-apple",
                    "fa-hive", "fa-gitkraken", "fa-keybase", "fa-apple-pay", "fa-padlet", "fa-amazon-pay",
                    "fa-square-github", "fa-stumbleupon", "fa-fedex", "fa-phoenix-framework", "fa-shopify", "fa-neos",
                    "fa-square-threads", "fa-hackerrank", "fa-researchgate", "fa-swift", "fa-angular", "fa-speakap",
                    "fa-angrycreative", "fa-y-combinator", "fa-empire", "fa-envira", "fa-google-scholar", "fa-square-gitlab",
                    "fa-studiovinari", "fa-pied-piper", "fa-wordpress", "fa-product-hunt", "fa-firefox", "fa-linode",
                    "fa-goodreads", "fa-square-odnoklassniki", "fa-jsfiddle", "fa-sith", "fa-themeisle", "fa-page4",
                    "fa-hashnode", "fa-react", "fa-cc-paypal", "fa-squarespace", "fa-cc-stripe", "fa-creative-commons-share",
                    "fa-bitcoin", "fa-keycdn", "fa-opera", "fa-itch-io", "fa-umbraco", "fa-galactic-senate",
                    "fa-ubuntu", "fa-draft2digital", "fa-stripe", "fa-houzz", "fa-gg", "fa-dhl",
                    "fa-square-pinterest", "fa-xing", "fa-blackberry", "fa-creative-commons-pd", "fa-playstation", "fa-quinscape",
                    "fa-less", "fa-blogger-b", "fa-opencart", "fa-vine", "fa-signal-messenger", "fa-paypal",
                    "fa-gitlab", "fa-typo3", "fa-reddit-alien", "fa-yahoo", "fa-dailymotion", "fa-affiliatetheme",
                    "fa-pied-piper-pp", "fa-bootstrap", "fa-odnoklassniki", "fa-nfc-symbol", "fa-mintbit", "fa-ethereum",
                    "fa-speaker-deck", "fa-creative-commons-nc-eu", "fa-patreon", "fa-avianex", "fa-ello", "fa-gofore",
                    "fa-bimobject", "fa-brave-reverse", "fa-facebook-f", "fa-square-google-plus", "fa-web-awesome", "fa-mandalorian",
                    "fa-first-order-alt", "fa-osi", "fa-google-wallet", "fa-d-and-d-beyond", "fa-periscope", "fa-fulcrum",
                    "fa-cloudscale", "fa-forumbee", "fa-mizuni", "fa-schlix", "fa-xing-square", "fa-bandcamp",
                    "fa-wpforms", "fa-cloudversify", "fa-usps", "fa-megaport", "fa-magento", "fa-spotify",
                    "fa-optin-monster", "fa-fly", "fa-square-bluesky", "fa-aviato", "fa-itunes", "fa-cuttlefish",
                    "fa-blogger", "fa-flickr", "fa-viber", "fa-soundcloud", "fa-digg", "fa-tencent-weibo",
                    "fa-letterboxd", "fa-symfony", "fa-maxcdn", "fa-etsy", "fa-facebook-messenger", "fa-audible",
                    "fa-think-peaks", "fa-bilibili", "fa-erlang", "fa-x-twitter", "fa-cotton-bureau", "fa-dashcube",
                    "fa-innosoft", "fa-stack-exchange", "fa-elementor", "fa-square-pied-piper", "fa-creative-commons-nd", "fa-palfed",
                    "fa-superpowers", "fa-resolving", "fa-xbox", "fa-square-web-awesome-stroke", "fa-searchengin", "fa-tiktok",
                    "fa-square-facebook", "fa-renren", "fa-linux", "fa-glide", "fa-linkedin", "fa-hubspot",
                    "fa-deploydog", "fa-twitch", "fa-flutter", "fa-ravelry", "fa-mixer", "fa-square-lastfm",
                    "fa-vimeo", "fa-mendeley", "fa-uniregistry", "fa-figma", "fa-creative-commons-remix", "fa-cc-amazon-pay",
                    "fa-dropbox", "fa-instagram", "fa-cmplid", "fa-upwork", "fa-facebook", "fa-gripfire",
                    "fa-jedi-order", "fa-uikit", "fa-fort-awesome-alt", "fa-phabricator", "fa-ussunnah", "fa-earlybirds",
                    "fa-trade-federation", "fa-autoprefixer", "fa-whatsapp", "fa-square-upwork", "fa-slideshare", "fa-google-play",
                    "fa-viadeo", "fa-line", "fa-google-drive", "fa-servicestack", "fa-simplybuilt", "fa-bitbucket",
                    "fa-imdb", "fa-deezer", "fa-raspberry-pi", "fa-jira", "fa-docker", "fa-screenpal",
                    "fa-bluetooth", "fa-gitter", "fa-d-and-d", "fa-microblog", "fa-cc-diners-club", "fa-gg-circle",
                    "fa-pied-piper-hat", "fa-kickstarter-k", "fa-yandex", "fa-readme", "fa-html5", "fa-sellsy",
                    "fa-square-web-awesome", "fa-sass", "fa-wsh", "fa-buromobelexperte", "fa-salesforce", "fa-octopus-deploy",
                    "fa-medapps", "fa-ns8", "fa-pinterest-p", "fa-apper", "fa-fort-awesome", "fa-waze",
                    "fa-bluesky", "fa-cc-jcb", "fa-snapchat-ghost", "fa-fantasy-flight-games", "fa-rust", "fa-wix",
                    "fa-square-behance", "fa-supple", "fa-webflow", "fa-rebel", "fa-css3", "fa-staylinked",
                    "fa-kaggle", "fa-space-awesome", "fa-deviantart", "fa-cpanel", "fa-goodreads-g", "fa-square-git",
                    "fa-tumblr-square", "fa-trello", "fa-creative-commons-nc-jp", "fa-get-pocket", "fa-perbyte", "fa-grunt",
                    "fa-weebly", "fa-connectdevelop", "fa-leanpub", "fa-black-tie", "fa-themeco", "fa-python",
                    "fa-android", "fa-bots", "fa-free-code-camp", "fa-hornbill", "fa-js", "fa-ideal",
                    "fa-git", "fa-dev", "fa-sketch", "fa-yandex-international", "fa-cc-amex", "fa-uber",
                    "fa-github", "fa-php", "fa-alipay", "fa-youtube", "fa-skyatlas", "fa-firefox-browser",
                    "fa-replyd", "fa-suse", "fa-jenkins", "fa-twitter", "fa-rockrms", "fa-pinterest",
                    "fa-buffer", "fa-npm", "fa-yammer", "fa-btc", "fa-dribbble", "fa-stumbleupon-circle",
                    "fa-internet-explorer", "fa-stubber", "fa-telegram-plane", "fa-old-republic", "fa-odysee", "fa-whatsapp-square",
                    "fa-node-js", "fa-edge-legacy", "fa-slack-hash", "fa-medrt", "fa-usb", "fa-tumblr",
                    "fa-vaadin", "fa-quora", "fa-square-x-twitter", "fa-reacteurope", "fa-medium-m", "fa-amilia",
                    "fa-mixcloud", "fa-flipboard", "fa-viacoin", "fa-critical-role", "fa-sitrox", "fa-discourse",
                    "fa-joomla", "fa-mastodon", "fa-airbnb", "fa-wolf-pack-battalion", "fa-buy-n-large", "fa-gulp",
                    "fa-creative-commons-sampling-plus", "fa-strava", "fa-ember", "fa-canadian-maple-leaf", "fa-teamspeak", "fa-pushed",
                    "fa-wordpress-simple", "fa-nutritionix", "fa-wodu", "fa-google-pay", "fa-intercom", "fa-zhihu",
                    "fa-korvue", "fa-pix", "fa-steam-symbol"
                ]
            };

            return this.fontAwesomeIconStyleData;
        }

        bindTrigger() {
            this.$trigger.on("click", (event) => {
                event.preventDefault();
                this.ensureModal();
                this.$modal.modal("show");
                this.loadConfiguredFiles();
            });
        }

        ensureModal() {
            if (this.$modal) {
                return;
            }

            const html = `
                <div class="modal fade" id="as-system-entries-editor-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-entries-editor-title">
                    <div class="modal-dialog modal-lg" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title" id="as-system-entries-editor-title">System Page Additions Editor</h4>
                            </div>
                            <div class="modal-body">
                                <nav class="navbar navbar-default">
                                    <div class="collapse navbar-collapse in">
                                        <div class="navbar-form">
                                            <div class="btn-toolbar" role="toolbar">
                                                <div class="btn-group" role="group">
                                                    <button type="button" class="btn btn-default" id="as-system-entries-open-action"><i class="fa fa-folder-open fa-fw"></i> Open</button>
                                                    <button type="button" class="btn btn-default" id="as-system-entries-new-action"><i class="fa fa-file fa-fw"></i> New</button>
                                                </div>
                                                <div class="btn-group" role="group">
                                                    <button type="button" class="btn btn-primary" id="as-system-entries-add-data"><i class="fa fa-database fa-fw"></i> Add Data</button>
                                                    <button type="button" class="btn btn-primary" id="as-system-entries-add-progress"><i class="fa fa-tasks fa-fw"></i> Add Progress</button>
                                                    <button type="button" class="btn btn-primary" id="as-system-entries-add-button"><i class="fa fa-square fa-fw"></i> Add Button</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </nav>
                                <div class="panel panel-default as-system-entries-open-panel">
                                    <div class="panel-heading">
                                        <div class="row">
                                            <div class="col-sm-12">
                                                <strong>Current File</strong>
                                                <div class="help-block" id="as-system-entries-current-file" style="margin-bottom: 0;"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="panel-body">
                                        <div id="as-system-entries-empty" class="alert alert-warning" style="display:none;"></div>
                                        <div class="table-responsive">
                                            <table class="table table-hover table-condensed">
                                                <thead>
                                                    <tr>
                                                        <th style="width: 120px;">Type</th>
                                                        <th style="width: 180px;">Label</th>
                                                        <th>Details</th>
                                                        <th style="width: 120px;" class="text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="as-system-entries-table-body"></tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <span class="pull-left text-muted" id="as-system-entries-message"></span>
                                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="as-system-entries-save"><i class="fa fa-save"></i> Save File</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.$modal = $(html);
            $("body").append(this.$modal);
            this.ensureBrowserModal();
            this.ensureEntryModal();
            this.ensureErrorModal();
            this.ensureResultModal();
            this.ensureIconPickerModal();

            this.$newPathInput = this.$browserModal.find("#as-system-entries-new-path");
            this.$tableBody = this.$modal.find("#as-system-entries-table-body");
            this.$empty = this.$modal.find("#as-system-entries-empty");
            this.$message = this.$modal.find("#as-system-entries-message");
            this.$currentFile = this.$modal.find("#as-system-entries-current-file");
            this.$entryType = this.$entryModal.find("#as-system-entry-type");

            this.$modal.on("click", "#as-system-entries-open-action", (event) => {
                event.preventDefault();
                this.openBrowser();
            });
            this.$modal.on("click", "#as-system-entries-new-action", (event) => {
                event.preventDefault();
                this.openBrowser("new");
            });
            this.$modal.on("click", "#as-system-entries-add-data", (event) => {
                event.preventDefault();
                this.openEntryEditor("data");
            });
            this.$modal.on("click", "#as-system-entries-add-progress", (event) => {
                event.preventDefault();
                this.openEntryEditor("progress");
            });
            this.$modal.on("click", "#as-system-entries-add-button", (event) => {
                event.preventDefault();
                this.openEntryEditor("button");
            });
            this.$modal.on("click", "#as-system-entries-save", () => this.saveActiveFile());
            this.$modal.on("click", ".as-system-entry-edit", (event) => {
                event.preventDefault();
                const index = Number($(event.currentTarget).attr("data-index"));
                if (!Number.isNaN(index)) {
                    this.openEntryEditor(null, index);
                }
            });
            this.$modal.on("click", ".as-system-entry-delete", (event) => {
                event.preventDefault();
                const index = Number($(event.currentTarget).attr("data-index"));
                if (!Number.isNaN(index)) {
                    this.deleteEntry(index);
                }
            });
            this.$modal.on("click", ".as-system-entry-test", (event) => {
                event.preventDefault();
                const index = Number($(event.currentTarget).attr("data-index"));
                if (!Number.isNaN(index)) {
                    this.testEntry(index);
                }
            });

            this.$entryType.on("change", () => this.updateEntryFieldVisibility());
            this.$entryModal.on("click", "#as-system-entry-save", () => this.saveEntryFromDialog());
            this.$entryModal.on("click", "#as-system-entry-icon-picker", (event) => {
                event.preventDefault();
                this.openIconPicker();
            });
            this.$entryModal.on("input", "#as-system-entry-icon", () => this.updateIconPreview());
            this.$entryModal.on("input", "#as-system-entry-command", () => this.updateEntryTestButtonState());
            this.$entryModal.on("click", "#as-system-entry-command-picker", (event) => {
                event.preventDefault();
                this.openCommandBrowser();
            });
            this.$entryModal.on("click", "#as-system-entry-test-command", (event) => {
                event.preventDefault();
                this.testEntryCommandFromDialog();
            });
        }

        ensureBrowserModal() {
            if (this.$browserModal) {
                return;
            }

            const html = `
                <div class="modal fade" id="as-system-entries-browser-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-entries-browser-title">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title" id="as-system-entries-browser-title">Open File</h4>
                            </div>
                            <div class="modal-body">
                                <div class="panel panel-default as-system-entries-open-panel">
                                    <div class="panel-heading">Open Existing File</div>
                                    <div class="panel-body">
                                        <div class="form-group">
                                            <div class="row">
                                                <div class="col-sm-8">
                                                    <label>Browse Files In ~/allsky/config/myFiles</label>
                                                    <div class="help-block" id="as-system-entries-browser-root" style="margin-top: 0; margin-bottom: 0;"></div>
                                                </div>
                                                <div class="col-sm-4 text-right" style="padding-top: 22px;">
                                                    <button type="button" class="btn btn-default" id="as-system-entries-browser-refresh"><i class="fa fa-refresh"></i> Refresh</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div id="as-system-entries-browser-list" class="list-group as-system-entries-browser-list"></div>
                                        <div class="form-group" style="margin-top: 15px; margin-bottom: 0;">
                                            <label>Selected File</label>
                                            <div class="well well-sm" id="as-system-entries-browser-selected" style="margin-bottom: 0;">No file selected.</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="panel panel-default as-system-entries-new-panel">
                                    <div class="panel-heading">Create New File</div>
                                    <div class="panel-body">
                                        <div class="form-group">
                                            <label for="as-system-entries-new-path">Filename</label>
                                            <div class="input-group">
                                                <span class="input-group-addon" id="as-system-entries-new-prefix">~/allsky/config/myFiles/</span>
                                                <input type="text" id="as-system-entries-new-path" class="form-control" placeholder="my_buttons.txt">
                                            </div>
                                            <div class="help-block" style="margin-bottom: 0;">New additions files are always stored in <code>~/allsky/config/myFiles</code> and saved with a <code>.txt</code> extension.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="as-system-entries-browser-open-footer" style="display:none;"><i class="fa fa-folder-open-o"></i> Open</button>
                                <button type="button" class="btn btn-primary" id="as-system-entries-browser-create-footer" style="display:none;"><i class="fa fa-file-o"></i> Create</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.$browserModal = $(html);
            $("body").append(this.$browserModal);
            this.$browserList = this.$browserModal.find("#as-system-entries-browser-list");

            this.$browserModal.on("click", "#as-system-entries-browser-open-footer", () => {
                const path = $.trim(this.$browserModal.attr("data-selected-file") || "");
                if (path === "") {
                    this.setMessage("Select a file to open.");
                    return;
                }
                this.openPath(path, "Opening selected file...");
            });
            this.$browserModal.on("click", "#as-system-entries-browser-refresh", () => this.browseDirectory(this.configDir));
            this.$browserModal.on("click", "#as-system-entries-browser-create-footer", () => {
                const fileName = $.trim(this.$browserModal.find("#as-system-entries-new-path").val() || "");
                if (fileName === "") {
                    this.setMessage("Enter the filename you want to create in ~/allsky/config/myFiles.");
                    return;
                }
                const path = this.buildConfigFilePath(fileName);
                this.openPath(path, "Opening new file path...");
            });
            this.$browserModal.on("click", ".as-system-browser-entry", (event) => {
                event.preventDefault();
                const $item = $(event.currentTarget);
                const type = $item.attr("data-type") || "";
                const path = $item.attr("data-path") || "";

                if (type === "directory") {
                    this.browseDirectory(path);
                    return;
                }

                if (type === "file" && path !== "") {
                    this.setSelectedBrowserFile(path);
                }
            });
        }

        ensureEntryModal() {
            if (this.$entryModal) {
                return;
            }

            const html = `
                <div class="modal fade" id="as-system-entry-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-entry-modal-title">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title" id="as-system-entry-modal-title">Entry</h4>
                            </div>
                            <div class="modal-body">
                                <form id="as-system-entry-form">
                                    <input type="hidden" id="as-system-entry-index" value="-1">
                                    <div class="alert alert-danger" id="as-system-entry-error" style="display:none; white-space: pre-wrap;"></div>
                                    <div class="form-group">
                                        <label for="as-system-entry-type">Type</label>
                                        <select id="as-system-entry-type" class="form-control">
                                            <option value="data">data</option>
                                            <option value="progress">progress</option>
                                            <option value="button">button</option>
                                        </select>
                                    </div>
                                    <div class="as-entry-fields as-entry-type-data as-entry-type-progress">
                                        <div class="form-group">
                                            <label for="as-system-entry-timeout">Timeout</label>
                                            <input type="text" class="form-control" id="as-system-entry-timeout" placeholder="0">
                                        </div>
                                        <div class="form-group">
                                            <label for="as-system-entry-label">Label</label>
                                            <input type="text" class="form-control" id="as-system-entry-label">
                                        </div>
                                        <div class="form-group">
                                            <label for="as-system-entry-data">Data</label>
                                            <input type="text" class="form-control" id="as-system-entry-data">
                                        </div>
                                    </div>
                                    <div class="as-entry-fields as-entry-type-progress">
                                        <div class="row">
                                            <div class="col-sm-6">
                                                <div class="form-group">
                                                    <label for="as-system-entry-min">Minimum</label>
                                                    <input type="text" class="form-control" id="as-system-entry-min">
                                                </div>
                                            </div>
                                            <div class="col-sm-6">
                                                <div class="form-group">
                                                    <label for="as-system-entry-current">Current</label>
                                                    <input type="text" class="form-control" id="as-system-entry-current">
                                                </div>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-sm-6">
                                                <div class="form-group">
                                                    <label for="as-system-entry-max">Maximum</label>
                                                    <input type="text" class="form-control" id="as-system-entry-max">
                                                </div>
                                            </div>
                                            <div class="col-sm-6">
                                                <div class="form-group">
                                                    <label for="as-system-entry-danger">Danger</label>
                                                    <input type="text" class="form-control" id="as-system-entry-danger">
                                                </div>
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <label for="as-system-entry-warning">Warning</label>
                                            <input type="text" class="form-control" id="as-system-entry-warning">
                                        </div>
                                    </div>
                                    <div class="as-entry-fields as-entry-type-button">
                                        <div class="form-group">
                                            <label for="as-system-entry-button-label">Button Label</label>
                                            <input type="text" class="form-control" id="as-system-entry-button-label">
                                        </div>
                                        <div class="form-group">
                                            <label for="as-system-entry-command">Command</label>
                                            <div class="input-group">
                                                <input type="text" class="form-control" id="as-system-entry-command">
                                                <span class="input-group-btn">
                                                    <button type="button" class="btn btn-default" id="as-system-entry-command-picker"><i class="fa fa-folder-open"></i> Browse</button>
                                                </span>
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <label for="as-system-entry-message">Success Message</label>
                                            <input type="text" class="form-control" id="as-system-entry-message" placeholder="-">
                                        </div>
                                        <div class="row">
                                            <div class="col-sm-6">
                                                <div class="form-group">
                                                    <label for="as-system-entry-color">Button Color</label>
                                                    <select class="form-control" id="as-system-entry-color">
                                                        <option value="green">green</option>
                                                        <option value="red">red</option>
                                                        <option value="blue">blue</option>
                                                        <option value="yellow">yellow</option>
                                                        <option value="cyan">cyan</option>
                                                        <option value="white">white</option>
                                                        <option value="black">black</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="col-sm-6">
                                                <div class="form-group">
                                                    <label for="as-system-entry-icon">Font Awesome Icon</label>
                                                    <div class="input-group">
                                                        <input type="text" class="form-control" id="as-system-entry-icon" placeholder="-">
                                                        <span class="input-group-btn">
                                                            <button type="button" class="btn btn-default" id="as-system-entry-icon-picker"><i class="fa fa-th-large"></i> Select</button>
                                                        </span>
                                                    </div>
                                                    <div class="help-block" id="as-system-entry-icon-preview" style="margin-bottom: 0;"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-info pull-left" id="as-system-entry-test-command" disabled><i class="fa fa-play"></i> Test Script</button>
                                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="as-system-entry-save"><i class="fa fa-check"></i> Save Entry</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.$entryModal = $(html);
            $("body").append(this.$entryModal);
        }

        ensureErrorModal() {
            if (this.$errorModal) {
                return;
            }

            const html = `
                <div class="modal fade" id="as-system-entries-error-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-entries-error-title">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title" id="as-system-entries-error-title">System Page Additions Error</h4>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-danger" id="as-system-entries-error-text" style="margin-bottom: 0;"></div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.$errorModal = $(html);
            $("body").append(this.$errorModal);
        }

        ensureResultModal() {
            if (this.$resultModal) {
                return;
            }

            const html = `
                <div class="modal fade" id="as-system-entries-result-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-entries-result-title">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title" id="as-system-entries-result-title">Command Test Result</h4>
                            </div>
                            <div class="modal-body">
                                <div class="alert" id="as-system-entries-result-status"></div>
                                <div class="panel panel-default" style="margin-bottom: 0;">
                                    <div id="as-system-entries-result-message" class="panel-body allow-select" style="white-space: pre-wrap;"></div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.$resultModal = $(html);
            $("body").append(this.$resultModal);
        }

        ensureIconPickerModal() {
            if (this.$iconPickerModal) {
                return;
            }

            const html = `
                <div class="modal fade" id="as-system-icon-picker-modal" tabindex="-1" role="dialog" aria-labelledby="as-system-icon-picker-title">
                    <div class="modal-dialog modal-lg" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                <h4 class="modal-title" id="as-system-icon-picker-title">Select Font Awesome Icon</h4>
                            </div>
                            <div class="modal-body">
                                <div class="form-group">
                                    <label for="as-system-icon-picker-search">Search Icons</label>
                                    <input type="text" class="form-control" id="as-system-icon-picker-search" placeholder="Search by icon name or style">
                                </div>
                                <div id="as-system-icon-picker-status" class="text-muted" style="margin-bottom: 10px;"></div>
                                <div id="as-system-icon-picker-list" class="row" style="max-height: 420px; overflow-y: auto; overflow-x: hidden;"></div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.$iconPickerModal = $(html);
            $("body").append(this.$iconPickerModal);

            this.$iconPickerModal.on("input", "#as-system-icon-picker-search", () => {
                this.renderIconPickerList(this.$iconPickerModal.find("#as-system-icon-picker-search").val() || "");
            });

            this.$iconPickerModal.on("click", ".as-system-icon-choice", (event) => {
                event.preventDefault();
                const icon = $(event.currentTarget).attr("data-icon") || "-";
                this.$entryModal.find("#as-system-entry-icon").val(icon);
                this.updateIconPreview();
                this.$iconPickerModal.modal("hide");
            });
        }

        loadConfiguredFiles() {
            this.setMessage("Loading configured files...");
            $.ajax({
                url: "includes/systembuttonsutil.php?request=Entries",
                method: "GET",
                dataType: "json",
                cache: false
            }).done((result) => {
                this.files = Array.isArray(result.files) ? result.files : [];
                this.configuredFiles = Array.isArray(result.configuredFiles) ? result.configuredFiles : [];
                this.configDir = $.trim(result.configDir || this.configDir);
                if (this.files.length > 0) {
                    this.activePath = this.files[0].path;
                } else {
                    this.activePath = "";
                }
                this.renderConfiguredFileList();
                this.renderTable();
                this.setMessage(this.files.length === 0 ? "No System Page Additions files are configured yet." : "");
            }).fail((xhr) => {
                this.files = [];
                this.configuredFiles = [];
                this.renderConfiguredFileList();
                this.renderTable();
                this.showError(xhr.responseJSON?.message || "Unable to load configured files.");
            });
        }

        openCommandBrowser() {
            const currentCommand = $.trim(this.$entryModal.find("#as-system-entry-command").val() || "");
            let browsePath = "";

            if (currentCommand !== "" && currentCommand.charAt(0) === "/") {
                browsePath = currentCommand.replace(/\/[^/]*$/, "") || "/";
            }

            $.allskyFileBrowser({
                url: "includes/uiutil.php?request=BrowseCommandFiles",
                startPath: browsePath,
                selected: currentCommand !== "" && currentCommand.charAt(0) === "/" ? currentCommand : "",
                requireExecutable: true,
                myFilesOnly: true,
                errorTitle: "Script Cannot Be Used",
                selectErrorText: "Select a file to use as the button command.",
                onSelect: (path) => {
                    this.$entryModal.find("#as-system-entry-command").val(path);
                    this.updateEntryTestButtonState();
                }
            }).open();
        }

        renderConfiguredFileList() {
            if (!this.$fileSelect) {
                return;
            }

            this.$fileSelect.empty();
            if (this.files.length === 0) {
                this.$fileSelect.append(new Option("No configured files", "", false, false));
                return;
            }

            this.files.forEach((file) => {
                this.$fileSelect.append(new Option(file.path, file.path, file.path === this.activePath, file.path === this.activePath));
            });
        }

        browseDirectory(path) {
            const browsePath = $.trim(path || this.configDir || "");
            this.$browserList.html('<div class="list-group-item text-muted">Loading...</div>');

            $.ajax({
                url: "includes/systembuttonsutil.php?request=BrowseFiles",
                method: "GET",
                dataType: "json",
                cache: false,
                data: {
                    path: browsePath
                }
            }).done((result) => {
                const currentPath = result.path || browsePath;
                const entries = Array.isArray(result.entries) ? result.entries : [];
                this.configDir = $.trim(result.configDir || this.configDir);
                this.$browserModal.find("#as-system-entries-browser-root").text(currentPath);
                this.$browserModal.find("#as-system-entries-new-prefix").text(this.configDir + "/");
                this.$browserList.empty();

                if (entries.length === 0) {
                    this.$browserList.html('<div class="list-group-item text-muted">No files or directories found.</div>');
                    return;
                }

                entries.forEach((entry) => {
                    const iconClass = entry.type === "directory" ? "fa-folder-open" : "fa-file-text-o";
                    const actionText = entry.type === "directory" ? "Open" : "Select";
                    this.$browserList.append(`
                        <a href="#" class="list-group-item as-system-browser-entry" data-type="${this.escapeHtml(entry.type || "")}" data-path="${this.escapeHtml(entry.path || "")}">
                            <span class="badge">${actionText}</span>
                            <i class="fa ${iconClass} fa-fw"></i> ${this.escapeHtml(entry.name || "")}
                        </a>
                    `);
                });
            }).fail((xhr) => {
                this.$browserList.html(`<div class="list-group-item text-danger">${this.escapeHtml(xhr.responseJSON?.message || "Unable to browse the selected directory.")}</div>`);
            });
        }

        openBrowser(mode) {
            this.ensureBrowserModal();
            this.renderConfiguredFileList();
            const browsePath = this.configDir || "";
            const $openPanel = this.$browserModal.find(".as-system-entries-open-panel");
            const $newPanel = this.$browserModal.find(".as-system-entries-new-panel");
            const $title = this.$browserModal.find("#as-system-entries-browser-title");
            const $createButton = this.$browserModal.find("#as-system-entries-browser-create-footer");
            const $openButton = this.$browserModal.find("#as-system-entries-browser-open-footer");

            if (mode === "new") {
                $title.text("New File");
                $openPanel.hide();
                $newPanel.show();
                $createButton.show();
                $openButton.hide();
            } else {
                $title.text("Open File");
                $openPanel.show();
                $newPanel.hide();
                $createButton.hide();
                $openButton.show();
            }

            this.$browserModal.find("#as-system-entries-browser-root").text(browsePath);
            this.$browserModal.find("#as-system-entries-new-prefix").text(this.configDir + "/");
            this.setSelectedBrowserFile("");
            this.$browserList.empty();
            if (mode === "new") {
                this.$browserModal.find("#as-system-entries-new-path").trigger("focus");
            }
            this.$browserModal.modal("show");
            this.browseDirectory(browsePath);
        }

        setSelectedBrowserFile(path) {
            const selectedPath = $.trim(path || "");
            const $selected = this.$browserModal.find("#as-system-entries-browser-selected");
            this.$browserModal.attr("data-selected-file", selectedPath);

            if (selectedPath === "") {
                $selected.text("No file selected.");
                return;
            }

            $selected.text(selectedPath);
        }

        buildConfigFilePath(fileName) {
            const safeName = fileName.replace(/^\/+/, "").replace(/\.txt$/i, "") + ".txt";
            return `${this.configDir}/${safeName}`;
        }

        openPath(path, overlayText) {
            $.LoadingOverlay("show", { text: overlayText || "Opening file..." });
            $.ajax({
                url: "includes/systembuttonsutil.php?request=Entries",
                method: "GET",
                dataType: "json",
                cache: false,
                data: {
                    path: path
                }
            }).done((result) => {
                if (result.file) {
                    this.upsertFile(result.file);
                    this.activePath = result.file.path;
                    this.editIndex = -1;
                    this.renderConfiguredFileList();
                    this.renderTable();
                    this.$browserModal.modal("hide");
                    this.setMessage(result.file.exists ? "File opened." : "New file path ready. Add rows and save to create it.");
                } else {
                    this.showError("Unable to open the selected file.");
                }
            }).fail((xhr) => {
                this.showError(xhr.responseJSON?.message || "Unable to open the selected file.");
            }).always(() => {
                $.LoadingOverlay("hide");
            });
        }

        loadFontAwesomeIcons() {
            if (this.fontAwesomeIconsLoaded) {
                return $.Deferred().resolve(this.fontAwesomeIcons).promise();
            }

            const icons = [];
            const seen = {};
            const addIcon = (style, iconClass) => {
                const iconName = this.normaliseFontAwesomeIconName(iconClass);
                const key = `${style}:${iconName}`;

                if (iconName === "" || seen[key]) {
                    return;
                }

                seen[key] = true;
                icons.push({
                    name: iconName,
                    iconClass: `fa-${iconName}`,
                    style: style,
                    styleClass: `fa-${style}`,
                    value: `${style} fa-${iconName}`
                });
            };
            const iconStyleData = this.getFontAwesomeIconStyleData();

            ["solid", "regular", "brands"].forEach((style) => {
                (iconStyleData[style] || []).forEach((iconClass) => addIcon(style, iconClass));
            });

            this.fontAwesomeIcons = icons.sort((left, right) => {
                const nameCompare = left.name.localeCompare(right.name);
                if (nameCompare !== 0) {
                    return nameCompare;
                }
                return this.getFontAwesomeStyleSort(left.style) - this.getFontAwesomeStyleSort(right.style);
            });
            this.fontAwesomeIconsLoaded = true;
            return $.Deferred().resolve(this.fontAwesomeIcons).promise();
        }

        getFontAwesomeStyleSort(style) {
            const order = {
                solid: 0,
                regular: 1,
                brands: 2
            };

            return Object.prototype.hasOwnProperty.call(order, style) ? order[style] : 9;
        }

        getFontAwesomeStyleLabel(style) {
            const labels = {
                solid: "Solid",
                regular: "Regular",
                brands: "Brands"
            };

            return Object.prototype.hasOwnProperty.call(labels, style) ? labels[style] : style;
        }

        normaliseFontAwesomeIconName(icon) {
            return $.trim(String(icon || ""))
                .replace(/^\./, "")
                .replace(/^fa-/, "");
        }

        getFontAwesomeStyleForIcon(iconName) {
            const name = this.normaliseFontAwesomeIconName(iconName);
            const matches = this.fontAwesomeIcons.filter((icon) => icon.name === name);

            if (matches.some((icon) => icon.style === "brands")) {
                return "brands";
            }
            if (matches.some((icon) => icon.style === "solid")) {
                return "solid";
            }
            if (matches.some((icon) => icon.style === "regular")) {
                return "regular";
            }

            return "solid";
        }

        getFontAwesomeIconRenderData(rawIcon) {
            const raw = $.trim(String(rawIcon || ""));
            if (raw === "" || raw === "-") {
                return null;
            }

            const tokens = raw.split(/\s+/);
            let style = "";
            let iconName = "";

            tokens.forEach((token) => {
                const value = token.toLowerCase();
                if (value === "solid" || value === "fa-solid" || value === "fas") {
                    style = "solid";
                    return;
                }
                if (value === "regular" || value === "fa-regular" || value === "far") {
                    style = "regular";
                    return;
                }
                if (value === "brands" || value === "fa-brands" || value === "fab") {
                    style = "brands";
                    return;
                }
                iconName = this.normaliseFontAwesomeIconName(value);
            });

            if (iconName === "") {
                return null;
            }
            if (style === "") {
                style = this.getFontAwesomeStyleForIcon(iconName);
            }

            return {
                name: iconName,
                iconClass: `fa-${iconName}`,
                style: style,
                styleClass: `fa-${style}`,
                value: `${style} fa-${iconName}`
            };
        }

        openIconPicker() {
            this.ensureIconPickerModal();
            const $status = this.$iconPickerModal.find("#as-system-icon-picker-status");
            const $search = this.$iconPickerModal.find("#as-system-icon-picker-search");

            $search.val("");
            $status.text("Loading icons...");
            this.$iconPickerModal.modal("show");

            this.loadFontAwesomeIcons().done(() => {
                $status.text(this.fontAwesomeIcons.length + " icons available");
                this.renderIconPickerList("");
            }).fail(() => {
                $status.text("Unable to load Font Awesome icons.");
                this.$iconPickerModal.find("#as-system-icon-picker-list").html("");
            });
        }

        renderIconPickerList(filterText) {
            const $list = this.$iconPickerModal.find("#as-system-icon-picker-list");
            const search = $.trim(String(filterText || "").toLowerCase());
            const filteredIcons = this.fontAwesomeIcons.filter((icon) => {
                return search === "" || icon.name.indexOf(search) !== -1 || icon.style.indexOf(search) !== -1;
            });

            if (filteredIcons.length === 0 && search !== "") {
                $list.html('<div class="col-sm-12"><div class="alert alert-warning" style="margin-bottom: 0;">No icons match your search.</div></div>');
                return;
            }

            const html = [];

            if (search === "") {
                html.push(`
                <div class="col-sm-12" style="margin-bottom: 12px;">
                    <h5 style="margin: 0 0 8px 0;"><strong>No Icon</strong></h5>
                </div>
                <div class="col-xs-6 col-sm-4 col-md-3" style="margin-bottom: 12px;">
                    <button type="button" class="btn btn-default btn-block as-system-icon-choice" data-icon="-" title="No icon" style="height: 72px;">
                        <div><span class="text-muted">None</span></div>
                        <div style="margin-top: 8px; font-size: 12px; white-space: normal; word-break: break-word;">No Icon</div>
                    </button>
                </div>
                `);
            }

            ["solid", "regular", "brands"].forEach((style) => {
                const icons = filteredIcons.filter((icon) => icon.style === style);

                if (icons.length === 0) {
                    return;
                }

                html.push(`
                <div class="col-sm-12" style="clear: both; margin: 8px 0 12px 0;">
                    <h5 style="margin: 0;"><strong>${this.escapeHtml(this.getFontAwesomeStyleLabel(style))}</strong> <span class="text-muted">(${icons.length})</span></h5>
                </div>
                `);

                icons.forEach((icon) => {
                    html.push(`
                <div class="col-xs-6 col-sm-4 col-md-3" style="margin-bottom: 12px;">
                    <button type="button" class="btn btn-default btn-block as-system-icon-choice" data-icon="${this.escapeHtml(icon.value)}" title="${this.escapeHtml(icon.iconClass)} (${this.escapeHtml(icon.style)})" style="height: 82px;">
                        <div><i class="fa ${this.escapeHtml(icon.styleClass)} ${this.escapeHtml(icon.iconClass)} fa-2x"></i></div>
                        <div style="margin-top: 8px; font-size: 12px; white-space: normal; word-break: break-word;">${this.escapeHtml(icon.iconClass)}</div>
                        <div class="text-muted" style="font-size: 11px;">${this.escapeHtml(this.getFontAwesomeStyleLabel(icon.style))}</div>
                    </button>
                </div>
                    `);
                });
            });

            $list.html(html.join(""));
        }

        updateIconPreview() {
            if (!this.$entryModal) {
                return;
            }

            const rawIcon = $.trim(this.$entryModal.find("#as-system-entry-icon").val() || "-");
            const icon = rawIcon === "" ? "-" : rawIcon;
            const $preview = this.$entryModal.find("#as-system-entry-icon-preview");

            if (icon === "-" || icon === "") {
                $preview.html('<span class="text-muted">No icon selected.</span>');
                return;
            }

            const iconData = this.getFontAwesomeIconRenderData(icon);
            if (!iconData) {
                $preview.html('<span class="text-muted">No icon selected.</span>');
                return;
            }

            $preview.html(`
                <span class="label label-default">Preview</span>
                <span style="margin-left: 8px;"><i class="fa ${this.escapeHtml(iconData.styleClass)} ${this.escapeHtml(iconData.iconClass)} fa-fw"></i> ${this.escapeHtml(iconData.iconClass)} <span class="text-muted">(${this.escapeHtml(iconData.style)})</span></span>
            `);
        }

        getActiveFile() {
            return this.files.find((file) => file.path === this.activePath) || null;
        }

        upsertFile(file) {
            if (!file || !file.path) {
                return;
            }

            const index = this.files.findIndex((entry) => entry.path === file.path);
            if (index >= 0) {
                this.files[index] = file;
            } else {
                this.files.push(file);
            }
        }

        renderTable() {
            const file = this.getActiveFile();
            this.$tableBody.empty();
            this.$empty.hide();

            if (!file) {
                this.$currentFile.text("No file open");
                this.$empty.text("Open an existing file or choose a new file path to begin editing.").show();
                return;
            }

            this.$currentFile.text(`${file.path}${file.exists ? "" : " (new file)"}`);

            const entries = Array.isArray(file.entries) ? file.entries : [];
            if (entries.length === 0) {
                this.$empty.text("This file has no entries yet. Use the toolbar above to add the first row.").show();
                return;
            }

            entries.forEach((entry, index) => {
                const actionButtons = [];
                if (entry.type === "button") {
                    actionButtons.push(`<button type="button" class="btn btn-info as-system-entry-test" data-index="${index}" title="Test command"><i class="fa fa-play"></i></button>`);
                }
                actionButtons.push(`<button type="button" class="btn btn-default as-system-entry-edit" data-index="${index}" title="Edit"><i class="fa fa-pencil"></i></button>`);
                actionButtons.push(`<button type="button" class="btn btn-danger as-system-entry-delete" data-index="${index}" title="Delete"><i class="fa fa-trash"></i></button>`);
                this.$tableBody.append(`
                    <tr>
                        <td><span class="label label-default">${this.escapeHtml(entry.type || "")}</span></td>
                        <td>${this.getEntryTitle(entry)}</td>
                        <td>${this.getEntryDetails(entry)}</td>
                        <td class="text-right">
                            <div class="btn-group btn-group-sm" role="group">
                                ${actionButtons.join("")}
                            </div>
                        </td>
                    </tr>
                `);
            });
        }

        getEntryTitle(entry) {
            if (entry.type === "button") {
                return this.escapeHtml(entry.label || "Unnamed Button");
            }
            return this.escapeHtml(entry.label || "Unnamed Entry");
        }

        getEntryDetails(entry) {
            if (entry.type === "button") {
                const parts = [
                    `Command: ${this.escapeHtml(entry.command || "")}`,
                    `Color: ${this.escapeHtml(entry.color || "")}`
                ];
                if (entry.icon && entry.icon !== "-") {
                    parts.push(`Icon: ${this.escapeHtml(entry.icon)}`);
                }
                return parts.join("<br>");
            }

            if (entry.type === "progress") {
                return [
                    `Data: ${this.escapeHtml(entry.data || "")}`,
                    `Range: ${this.escapeHtml(entry.min || "0")} to ${this.escapeHtml(entry.max || "0")}`,
                    `Current: ${this.escapeHtml(entry.current || "0")}`,
                    `Thresholds: warning ${this.escapeHtml(entry.warning || "0")}, danger ${this.escapeHtml(entry.danger || "0")}`
                ].join("<br>");
            }

            return [
                `Data: ${this.escapeHtml(entry.data || "")}`,
                `Timeout: ${this.escapeHtml(entry.timeout || "0")}`
            ].join("<br>");
        }

        openEntryEditor(type, index) {
            const file = this.getActiveFile();
            if (!file) {
                this.setMessage("Open or create a file before adding entries.");
                this.openBrowser("new");
                return;
            }

            this.editIndex = Number.isInteger(index) ? index : -1;
            this.resetEntryForm();

            if (this.editIndex >= 0 && file.entries && file.entries[this.editIndex]) {
                this.populateEntryForm(file.entries[this.editIndex], this.editIndex);
                this.$entryModal.find("#as-system-entry-modal-title").text("Edit Entry");
            } else {
                this.$entryModal.find("#as-system-entry-modal-title").text(`Add ${type ? type.charAt(0).toUpperCase() + type.slice(1) : "Entry"}`);
                this.$entryModal.find("#as-system-entry-type").val(type || "data");
            }

            this.updateEntryFieldVisibility();
            this.$entryModal.modal("show");
        }

        resetEntryForm() {
            const form = this.$entryModal.find("#as-system-entry-form")[0];
            if (form) {
                form.reset();
            }

            this.hideEntryError();
            this.$entryModal.find("#as-system-entry-index").val("-1");
            this.$entryModal.find("#as-system-entry-type").val("data");
            this.$entryModal.find("#as-system-entry-timeout").val("0");
            this.$entryModal.find("#as-system-entry-min").val("0");
            this.$entryModal.find("#as-system-entry-current").val("0");
            this.$entryModal.find("#as-system-entry-max").val("100");
            this.$entryModal.find("#as-system-entry-danger").val("0");
            this.$entryModal.find("#as-system-entry-warning").val("0");
            this.$entryModal.find("#as-system-entry-message").val("-");
            this.$entryModal.find("#as-system-entry-icon").val("-");
            this.$entryModal.find("#as-system-entry-color").val("green");
            this.updateIconPreview();
            this.updateEntryTestButtonState();
        }

        populateEntryForm(entry, index) {
            this.hideEntryError();
            this.$entryModal.find("#as-system-entry-index").val(String(index));
            this.$entryModal.find("#as-system-entry-type").val(entry.type || "data");
            this.$entryModal.find("#as-system-entry-timeout").val(entry.timeout || "0");
            this.$entryModal.find("#as-system-entry-label").val(entry.label || "");
            this.$entryModal.find("#as-system-entry-data").val(entry.data || "");
            this.$entryModal.find("#as-system-entry-min").val(entry.min || "0");
            this.$entryModal.find("#as-system-entry-current").val(entry.current || "0");
            this.$entryModal.find("#as-system-entry-max").val(entry.max || "100");
            this.$entryModal.find("#as-system-entry-danger").val(entry.danger || "0");
            this.$entryModal.find("#as-system-entry-warning").val(entry.warning || "0");
            this.$entryModal.find("#as-system-entry-button-label").val(entry.label || "");
            this.$entryModal.find("#as-system-entry-command").val(entry.command || "");
            this.$entryModal.find("#as-system-entry-message").val(entry.message || "-");
            this.$entryModal.find("#as-system-entry-color").val(entry.color || "green");
            this.$entryModal.find("#as-system-entry-icon").val(entry.icon || "-");
            this.updateIconPreview();
            this.updateEntryTestButtonState();
        }

        updateEntryFieldVisibility() {
            const type = this.$entryType.val() || "data";
            this.$entryModal.find(".as-entry-fields").hide();
            this.$entryModal.find(`.as-entry-type-${type}`).show();
        }

        showEntryError(message) {
            this.$entryModal.find("#as-system-entry-error").text(message || "Unable to save this entry.").show();
        }

        hideEntryError() {
            this.$entryModal.find("#as-system-entry-error").hide().text("");
        }

        updateEntryTestButtonState() {
            const command = $.trim(this.$entryModal.find("#as-system-entry-command").val() || "");
            this.$entryModal.find("#as-system-entry-test-command").prop("disabled", command === "");
        }

        buildEntryFromDialog() {
            const type = this.$entryType.val() || "data";
            if (type === "data") {
                return {
                    type: "data",
                    timeout: $.trim(this.$entryModal.find("#as-system-entry-timeout").val() || "0"),
                    label: $.trim(this.$entryModal.find("#as-system-entry-label").val() || ""),
                    data: $.trim(this.$entryModal.find("#as-system-entry-data").val() || "")
                };
            }

            if (type === "progress") {
                return {
                    type: "progress",
                    timeout: $.trim(this.$entryModal.find("#as-system-entry-timeout").val() || "0"),
                    label: $.trim(this.$entryModal.find("#as-system-entry-label").val() || ""),
                    data: $.trim(this.$entryModal.find("#as-system-entry-data").val() || ""),
                    min: $.trim(this.$entryModal.find("#as-system-entry-min").val() || "0"),
                    current: $.trim(this.$entryModal.find("#as-system-entry-current").val() || "0"),
                    max: $.trim(this.$entryModal.find("#as-system-entry-max").val() || "100"),
                    danger: $.trim(this.$entryModal.find("#as-system-entry-danger").val() || "0"),
                    warning: $.trim(this.$entryModal.find("#as-system-entry-warning").val() || "0")
                };
            }

            return {
                type: "button",
                label: $.trim(this.$entryModal.find("#as-system-entry-button-label").val() || ""),
                command: $.trim(this.$entryModal.find("#as-system-entry-command").val() || ""),
                message: $.trim(this.$entryModal.find("#as-system-entry-message").val() || "-") || "-",
                color: $.trim(this.$entryModal.find("#as-system-entry-color").val() || "green"),
                icon: this.getFontAwesomeIconRenderData(this.$entryModal.find("#as-system-entry-icon").val())?.value || "-"
            };
        }

        validateEntry(entry) {
            if (entry.type === "button") {
                if (entry.label === "" || entry.command === "") {
                    return {
                        ok: false,
                        message: "Complete the required fields for this entry."
                    };
                }

                if (/\s/.test(entry.command)) {
                    return {
                        ok: false,
                        message: "Choose one script file only. For safety, button actions cannot include extra words, options, or more than one command."
                    };
                }

                if (/[;&|<>`$()]/.test(entry.command)) {
                    return {
                        ok: false,
                        message: "This button action contains characters Allsky does not allow. Select a single script file instead. If the script needs to do several things, put those steps inside the script."
                    };
                }

                return { ok: true, message: "" };
            }

            if (entry.label === "" || entry.data === "") {
                return {
                    ok: false,
                    message: "Complete the required fields for this entry."
                };
            }

            return { ok: true, message: "" };
        }

        saveEntryFromDialog() {
            const file = this.getActiveFile();
            if (!file) {
                this.setMessage("Open or create a file before saving entries.");
                return;
            }

            const entry = this.buildEntryFromDialog();
            const validation = this.validateEntry(entry);
            if (!validation.ok) {
                this.showEntryError(validation.message);
                return;
            }

            if (entry.type === "button") {
                this.validateButtonEntryBeforeSave(entry, () => {
                    this.commitEntryFromDialog(file, entry);
                });
                return;
            }

            this.commitEntryFromDialog(file, entry);
        }

        validateButtonEntryBeforeSave(entry, onValid) {
            this.hideEntryError();

            this.$entryModal.find("#as-system-entry-save").prop("disabled", true);
            $.LoadingOverlay("show", { text: "Checking script..." });
            $.ajax({
                url: "includes/systembuttonsutil.php?request=ValidateCommand",
                method: "POST",
                dataType: "json",
                contentType: "application/json",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-Token": $("#csrf_token").val() || ""
                },
                data: JSON.stringify({
                    command: entry.command
                })
            }).done((result) => {
                if (!result || !result.ok) {
                    this.showEntryError(result?.message || "Allsky could not validate this script. Check the script and try again.");
                    return;
                }
                if ($.trim(result.command || "") !== "") {
                    entry.command = $.trim(result.command);
                    this.$entryModal.find("#as-system-entry-command").val(entry.command);
                }
                onValid();
            }).fail((xhr) => {
                this.showEntryError(xhr.responseJSON?.message || "Allsky could not validate this script. Check the script and try again.");
            }).always(() => {
                this.$entryModal.find("#as-system-entry-save").prop("disabled", false);
                $.LoadingOverlay("hide");
            });
        }

        commitEntryFromDialog(file, entry) {
            this.hideEntryError();
            if (!Array.isArray(file.entries)) {
                file.entries = [];
            }

            const index = Number(this.$entryModal.find("#as-system-entry-index").val());
            if (!Number.isNaN(index) && index >= 0 && file.entries[index]) {
                file.entries[index] = entry;
            } else {
                file.entries.push(entry);
            }

            this.$entryModal.modal("hide");
            this.renderTable();
            this.setMessage("Entry updated. Save the file to apply the changes.");
        }

        deleteEntry(index) {
            const file = this.getActiveFile();
            if (!file || !Array.isArray(file.entries) || !file.entries[index]) {
                this.setMessage("Select a valid entry to delete.");
                return;
            }

            file.entries.splice(index, 1);
            this.renderTable();
            this.setMessage("Entry removed. Save the file to apply the changes.");
        }

        testEntry(index) {
            const file = this.getActiveFile();
            if (!file || !Array.isArray(file.entries) || !file.entries[index]) {
                this.showError("Select a valid button entry to test.");
                return;
            }

            const entry = file.entries[index];
            if ((entry.type || "") !== "button") {
                this.showError("Only button entries can be tested.");
                return;
            }

            const command = $.trim(entry.command || "");
            if (command === "") {
                this.showError("Enter a command before testing this button.");
                return;
            }

            $.LoadingOverlay("show", { text: "Testing command..." });
            $.ajax({
                url: "includes/systembuttonsutil.php?request=RunCommand",
                method: "POST",
                dataType: "json",
                contentType: "application/json",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-Token": $("#csrf_token").val() || ""
                },
                data: JSON.stringify({
                    command: command,
                    label: $.trim(entry.label || "Test Command")
                })
            }).done((result) => {
                this.showResult(result.title || "Command Test Result", result.message || "", !!result.ok);
            }).fail((xhr) => {
                this.showError(xhr.responseJSON?.message || "Unable to test the selected command.");
            }).always(() => {
                $.LoadingOverlay("hide");
            });
        }

        testEntryCommandFromDialog() {
            const command = $.trim(this.$entryModal.find("#as-system-entry-command").val() || "");
            const label = $.trim(this.$entryModal.find("#as-system-entry-button-label").val() || "Test Command");
            const successMessage = $.trim(this.$entryModal.find("#as-system-entry-message").val() || "");

            if (command === "") {
                this.showEntryError("Enter a command before testing this button.");
                return;
            }

            const validation = this.validateEntry({
                type: "button",
                label: label,
                command: command
            });
            if (!validation.ok) {
                this.showEntryError(validation.message);
                return;
            }

            this.hideEntryError();
            $.LoadingOverlay("show", { text: "Testing command..." });
            $.ajax({
                url: "includes/systembuttonsutil.php?request=RunCommand",
                method: "POST",
                dataType: "json",
                contentType: "application/json",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-Token": $("#csrf_token").val() || ""
                },
                data: JSON.stringify({
                    command: command,
                    label: label
                })
            }).done((result) => {
                this.showResult(result.title || "Command Test Result", result.message || "", !!result.ok, successMessage !== "-" ? successMessage : "");
            }).fail((xhr) => {
                this.showError(xhr.responseJSON?.message || "Unable to test the selected command.");
            }).always(() => {
                $.LoadingOverlay("hide");
            });
        }

        saveActiveFile() {
            const file = this.getActiveFile();
            if (!file) {
                this.setMessage("Open or create a file before saving.");
                return;
            }

            $.LoadingOverlay("show", { text: "Saving System page additions..." });
            $.ajax({
                url: "includes/systembuttonsutil.php?request=SaveEntries",
                method: "POST",
                dataType: "json",
                contentType: "application/json",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-Token": $("#csrf_token").val() || ""
                },
                data: JSON.stringify({
                    path: file.path,
                    entries: file.entries || []
                })
            }).done((result) => {
                const updated = result.file || null;
                if (updated) {
                    this.upsertFile(updated);
                    this.activePath = updated.path;
                }
                this.renderConfiguredFileList();
                this.renderTable();
                this.setMessage("System Page Additions file saved.");
                this.handlePostSaveSettingUpdate(file.path);
            }).fail((xhr) => {
                this.showError(xhr.responseJSON?.message || "Unable to save the System Page Additions file.");
                $.LoadingOverlay("hide");
            });
        }

        handlePostSaveSettingUpdate(path) {
            const configuredPath = this.configuredFiles.length > 0 ? $.trim(this.configuredFiles[0] || "") : "";
            let shouldUpdateSetting = false;

            if (configuredPath === "") {
                shouldUpdateSetting = true;
            } else if (configuredPath !== path) {
                shouldUpdateSetting = window.confirm("This file is different from the current System Page Additions file in settings.\n\nDo you want to update the setting to use:\n" + path);
            }

            if (shouldUpdateSetting) {
                this.updateWebUiDataFileSetting(path);
                return;
            }

            this.finishSuccessfulSave();
        }

        updateWebUiDataFileSetting(path) {
            $.ajax({
                url: "includes/systembuttonsutil.php?request=UpdateWebUiDataFile",
                method: "POST",
                dataType: "json",
                contentType: "application/json",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-Token": $("#csrf_token").val() || ""
                },
                data: JSON.stringify({
                    path: path
                })
            }).done(() => {
                this.configuredFiles = [path];
                this.finishSuccessfulSave();
            }).fail((xhr) => {
                this.showError(xhr.responseJSON?.message || "The file was saved, but the setting could not be updated.");
                $.LoadingOverlay("hide");
            });
        }

        finishSuccessfulSave() {
            this.$modal.modal("hide");
            if (typeof window.asSystemRefresh === "function") {
                window.asSystemRefresh(() => {
                    $.LoadingOverlay("hide");
                });
                return;
            }
            $.LoadingOverlay("hide");
        }

        setMessage(text) {
            this.$message.text(text || "");
        }

        showError(message) {
            this.ensureErrorModal();
            this.$errorModal.find("#as-system-entries-error-text").text(message || "An unexpected error occurred.");
            this.$errorModal.modal("show");
        }

        formatResultMessage(message) {
            const text = String(message || "");
            const lines = text.split("\n");
            const html = [];
            const commandPattern = /^(sudo\s+|ls\s+|head\s+|command\s+|chmod\s+|chown\s+|python[0-9.\-]*\s+|bash\s+|sh\s+|\/)/;

            lines.forEach((line) => {
                const trimmed = $.trim(line);
                if (trimmed === "") {
                    html.push("<div>&nbsp;</div>");
                    return;
                }

                if (commandPattern.test(trimmed)) {
                    html.push(`<pre class="allow-select" style="margin: 6px 0; white-space: pre-wrap;"><code>${this.escapeHtml(trimmed)}</code></pre>`);
                    return;
                }

                html.push(`<div>${this.escapeHtml(line)}</div>`);
            });

            return html.join("");
        }

        showResult(title, message, ok, successText) {
            this.ensureResultModal();
            this.$resultModal.find("#as-system-entries-result-title").text(title || "Command Test Result");
            const statusText = ok ? ($.trim(successText || "") || "Action completed.") : "Action could not be run.";
            this.$resultModal.find("#as-system-entries-result-status")
                .removeClass("alert-success alert-danger")
                .addClass(ok ? "alert-success" : "alert-danger")
                .text(statusText);
            this.$resultModal.find("#as-system-entries-result-message").html(this.formatResultMessage(message));
            this.$resultModal.modal("show");
        }

        escapeHtml(value) {
            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    }

    $.fn.systemPageButtons = function () {
        return this.each(function () {
            if (!$.data(this, "systemPageButtons")) {
                $.data(this, "systemPageButtons", new SystemPageEntriesEditor(this));
            }
        });
    };
}(jQuery));
