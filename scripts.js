// --- Google Translate & Geolocation Logic ---

// Function to initialize Google Translate widget. This is called by Google's script.
function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'en', // Set the original language of your HTML content
        autoDisplay: false // Important: Prevent the default dropdown from showing immediately
    }, 'google_translate_element');
}

// Function to set the page language using the Google Translate widget
function setLanguage(langCode) {
    // Wait for the Google Translate element to be fully loaded and selectable
    const checkExist = setInterval(function () {
        const selectElement = document.querySelector('#google_translate_element select');
        if (selectElement) {
            clearInterval(checkExist); // Stop checking once the element is found
            selectElement.value = langCode; // Set the selected language
            selectElement.dispatchEvent(new Event('change')); // Trigger the change event to apply translation
            console.log(`Page language set to: ${langCode}`);
        }
    }, 100); // Check every 100ms
}

// --- Geolocation and Language Detection Logic ---
function getLocationAndTranslate() {
    if (navigator.geolocation) {
        // Get the current position of the user's device
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);

                let detectedLang = 'en'; // Default language in case of API failure or no specific mapping

                // --- Reverse Geocoding API Call ---
                try {
                    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                    const data = await response.json();
                    const countryCode = data.countryCode;

                    // Map country codes to common language codes
                    const languageMap = {
                        "US": "en", "GB": "en", "CA": "en", "AU": "en", "IE": "en", "NZ": "en",
                        "FR": "fr", "DE": "de", "ES": "es", "IT": "it", "PT": "pt", "BR": "pt",
                        "MX": "es", "JP": "ja", "CN": "zh-CN", "KR": "ko", "RU": "ru",
                        "IN": "en", // Default for India
                        // Indian States
                        "AP": "te", "AR": "en", "AS": "as", "BR": "hi", "CT": "hi", "GA": "kon",
                        "GJ": "gu", "HR": "hi", "HP": "hi", "JH": "hi", "KA": "kn", "KL": "ml",
                        "MP": "hi", "MH": "mr", "MN": "mni", "ML": "en", "MZ": "lus", "NL": "en",
                        "OR": "or", "PB": "pa", "RJ": "hi", "SK": "ne", "TN": "ta", "TG": "te",
                        "TR": "bn", "UP": "hi", "UT": "hi", "WB": "bn",
                        // Union Territories
                        "AN": "hi", "CH": "en", "DN": "gu", "DL": "hi", "JK": "ur", "LA": "hi",
                        "LD": "ml", "PY": "ta",
                        // Fallback
                        "default": "en"
                    };

                    detectedLang = languageMap[countryCode] || 'en';
                    console.log(`Detected country code: ${countryCode}, mapped language: ${detectedLang}`);
                } catch (error) {
                    console.error("Error fetching reverse geocoding data:", error);
                    detectedLang = 'en'; // Fallback on API error
                }

                setLanguage(detectedLang); // Set the page language using the detected language
            },
            (error) => {
                console.error("Error getting user location:", error.code, error.message);
                setLanguage("en");
            }
        );
    } else {
        console.log("Geolocation is not supported by this browser.");
        setLanguage("en");
    }
}

// Load the Google Translate `element.js` script dynamically.
const script = document.createElement('script');
script.type = 'text/javascript';
script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
document.head.appendChild(script);

// After the Google Translate script is loaded, call our geolocation function.
script.onload = () => {
    setTimeout(getLocationAndTranslate, 500); // 500ms delay
};
