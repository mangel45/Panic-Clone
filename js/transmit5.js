var body = document.body;
var header = document.getElementsByTagName("header")[0];

window.addEventListener('touchstart', function didTouch() {
  document.body.classList.add('touch');
  window.removeEventListener('touchstart', didTouch, false);
}, false);

// Prepare to load the WebGL truck. (The JS alone is like 800k, so we'll only load it if WebGL is available.)
var truckJS = document.createElement("script");
truckJS.type = "text/javascript";
truckJS.src = "./js/3dtruck.min.js";

// Check for WebGL (from http://www.studyjs.com/webgl/webglcontext.html)
var webgl = null;
var canvas = document.createElement('canvas');
var webglContextParams = ['webgl', 'experimental-webgl', 'webkit-3d', 'moz-webgl'];
var webglContext = null;
for (var index = 0; index < webglContextParams.length; index++) {
    try {
        webglContext = canvas.getContext(webglContextParams[index]);
        if (webglContext) {
            //breaking as we got our context
            break;
        }
    } catch (E) {
        console.log(E);
    }
}
if (webglContext === null || window.matchMedia('(prefers-reduced-motion)').matches) {
    // No WebGL available, or the user wants reduced motion, so don't load the 3d truck.
    webgl = false;
    document.body.dataset.mobile = true;
    header.dataset.loaded = "never";
} else {
    // WebGL is available, go ahead and load the truck!
    webgl = true;
    body.appendChild(truckJS);

    if (/Mobi/.test(navigator.userAgent)) {
      // Full size truck on mobile
      document.body.dataset.webgl = "high";
    }
}


if (window.matchMedia('(prefers-reduced-motion)').matches) {
    // User requests reduced motion.
    document.body.dataset.reduceMotion = true;
}

var navbar = document.getElementById("navbar");
var buy = document.getElementById("buy");
var download = document.getElementById("download");

download.dataset.visible = "false";

// Hook up try/buy buttons
document.getElementById('button-try').setAttribute("onclick", 'toggleSection(download);');
document.getElementById('button-buy').setAttribute("onclick", 'toggleSection(buy);');

var visibleSection = null;

// Expand or contract a disclosable section
function toggleSection(section) {
    var newSection = section;

    if (visibleSection === newSection) {
       // The selected section is already visible, so close it and remove location hash.
        newSection.dataset.visible = "false";
        navbar.dataset.activeSection = "none";
        visibleSection = null;
        history.replaceState(null, null, (loc + special));
    } else {
        if (visibleSection !== null) {
        // A section is visible, but it's not the one we want. Close it, wait for it to finish closing, then open the new one.
            visibleSection.dataset.visible = "false";
            window.setTimeout(function() {
                newSection.dataset.visible = "true";
                visibleSection = newSection;
                navbar.dataset.activeSection = newSection.id;
                window.scrollTo(0,(navbar.offsetTop));
                history.replaceState(null, null, (loc + special + '#' + newSection.id));
            }, 375);
        } else {
        // No sections are open so let's just open it up.
            newSection.dataset.visible = "true";
            visibleSection = newSection;
            navbar.dataset.activeSection = newSection.id;
            window.scrollTo(0,(navbar.offsetTop));
            history.replaceState(null, null, (loc + special + '#' + newSection.id));
        }
    }
}

// Trigger chart animation when charts scroll into view
var charts = document.getElementById("charts");
var chartHeight = charts.getBoundingClientRect().height;

function animateCharts() {
  var pos = charts.getBoundingClientRect().top - window.innerHeight + chartHeight;
  if (pos <= 200) {
      if(window.location.href.indexOf("jp") > -1) {
           createCharts("jp"); // from charts.js
        } else {
           createCharts(); // from charts.js
        }
      
    window.removeEventListener('scroll', animateCharts, true);
  } else {
  }
}

animateCharts();
window.addEventListener('scroll', animateCharts, true );


// Handle location hashes on load
var loc = (document.location.origin + document.location.pathname).toLowerCase();
var hash = (document.location.hash).toLowerCase();
var special = (document.location.search).toLowerCase();
var promoCode = '';

if (hash.indexOf('#buy') > -1 && special === "") {
    toggleSection(buy);
}

if (hash.indexOf('#download') > -1 && special === "") {
    toggleSection(download);
}

if (special.indexOf('reseller') > -1) {
    document.body.dataset.reseller = "true";
    document.getElementById("mf_reseller").value = "yes";
    document.body.dataset.applepay = false;
    toggleSection(buy);
}

if (special.indexOf('promo') > -1) {
    promoCode = special.substr(7).toUpperCase().replace(/[^0-9a-zA-Z_-]/g, '');
    document.body.dataset.promo = "true";
    document.getElementById("promoCode").value = promoCode;
    document.getElementById("code").innerText = promoCode;
    getPromoCode();
    toggleSection(buy);
    if (promoCode.length <= 0) {document.getElementById("promo").setAttribute("class","invalid");}
}

function reveal(e){
    let screenshot = e.currentTarget;
    screenshot.classList.toggle('dark');
}

let screenshots = document.querySelectorAll("figure.screenshot");

for (var i = 0, len = screenshots.length; i < len; i++) {
    screenshots[i].addEventListener("click", reveal);
}