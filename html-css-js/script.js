// --- GLOBAL STATE ---
let currentType = 'length';
let currentAction = 'compare';
let authMode = 'signup';

const unitData = {
    length: { km: 1000, m: 1, cm: 0.01, mm: 0.001, mile: 1609.34, yard: 0.9144, inch: 0.0254 },
    weight: { kg: 1, g: 0.001, mg: 0.000001, tonne: 1000, pound: 0.453592, ounce: 0.0283495 },
    temp: { celsius: 'c', fahrenheit: 'f', kelvin: 'k' },
    volume: { litre: 1, ml: 0.001, gallon: 3.78541, cubic_m: 1000, cup: 0.24 }
};

// --- POPUP ---
function openPopup(title, msg, type = 'success') {
    const overlay = document.getElementById('popup-overlay');
    const btn = document.getElementById('popup-btn');

    document.getElementById('popup-title').textContent = title;
    document.getElementById('popup-message').textContent = msg;

    if(type === 'error') {
        document.getElementById('popup-icon').textContent = '⚠️';
        btn.style.backgroundColor = 'var(--error)';
    } else if(type === 'logout') {
        document.getElementById('popup-icon').textContent = '👋';
        btn.style.backgroundColor = 'var(--primary-blue)';
    } else {
        document.getElementById('popup-icon').textContent = '✅';
        btn.style.backgroundColor = 'var(--success)';
    }

    overlay.style.display = 'flex';
}

function closePopup() {
    document.getElementById('popup-overlay').style.display = 'none';

    if(document.getElementById('popup-title').textContent === 'Logged Out') {
        location.reload();
    }
}

// --- TAB SWITCH ---
function switchTab(mode) {
    authMode = mode;

    const nameGrp = document.getElementById('name-group');
    const mobGrp = document.getElementById('mobile-group');
    const btn = document.getElementById('submit-btn');

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`${mode}-tab`).classList.add('active');

    if(mode === 'login') {
        nameGrp.classList.add('hidden');
        mobGrp.classList.add('hidden');
        btn.textContent = 'Login to Dashboard';
    } else {
        nameGrp.classList.remove('hidden');
        mobGrp.classList.remove('hidden');
        btn.textContent = 'Create Account';
    }
}

// --- IMPORTANT FIX: WAIT FOR DOM ---
document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('auth-form');

    form.onsubmit = (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;

        if (authMode === 'signup') {

            localStorage.setItem('userEmail', email);
            localStorage.setItem('userPass', pass);

            openPopup("Success!", "Account created! You can now log in.");
            switchTab('login');
            form.reset();

        } else {

            const savedEmail = localStorage.getItem('userEmail');
            const savedPass = localStorage.getItem('userPass');

            if (email === savedEmail && pass === savedPass) {

                openPopup("Welcome Back!", "Correct credentials. Accessing dashboard...");

                setTimeout(() => {
                    document.getElementById('auth-page').style.display = 'none';
                    document.getElementById('dashboard').style.display = 'flex';

                    populateUnits();
                    calc();
                }, 1200);

            } else {
                openPopup("Access Denied", "Invalid email or password.", "error");
            }
        }
    };

});

// --- LOGOUT ---
function triggerLogout() {
    openPopup("Logged Out", "You have been securely logged out.", "logout");
}

// --- TYPE ---
function setType(type, el) {
    currentType = type;

    document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');

    populateUnits();
    calc();
}

// --- ACTION ---
function setAction(action, el) {
    currentAction = action;

    document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');

    const op = document.getElementById('op-icon');
    const resSel = document.getElementById('unit-res');
    const inRight = document.getElementById('val-right');

    if(action === 'compare') {
        op.textContent = '↔';
        resSel.classList.add('hidden');
        inRight.readOnly = false;
    }

    if(action === 'convert') {
        op.textContent = '→';
        resSel.classList.add('hidden');
        inRight.readOnly = true;
    }

    if(action === 'arithmetic') {
        op.textContent = '+';
        resSel.classList.remove('hidden');
        inRight.readOnly = false;
    }

    calc();
}

// --- UNITS ---
function populateUnits() {
    const list = Object.keys(unitData[currentType]);
    const html = list.map(u => `<option value="${u}">${u.toUpperCase()}</option>`).join('');

    document.getElementById('unit-left').innerHTML = html;
    document.getElementById('unit-right').innerHTML = html;
    document.getElementById('unit-res').innerHTML = html;
}

// --- CALC ---
function calc() {
    const v1 = parseFloat(document.getElementById('val-left').value) || 0;
    const v2 = parseFloat(document.getElementById('val-right').value) || 0;

    const u1 = document.getElementById('unit-left').value;
    const u2 = document.getElementById('unit-right').value;

    const out = document.getElementById('res-display');

    if (currentType === 'temp') {
        if(currentAction === 'convert') {
            let result = v1;

            if(u1 === 'celsius' && u2 === 'fahrenheit') result = (v1 * 9/5) + 32;
            else if(u1 === 'celsius' && u2 === 'kelvin') result = v1 + 273.15;
            else if(u1 === 'fahrenheit' && u2 === 'celsius') result = (v1 - 32) * 5/9;
            else if(u1 === 'fahrenheit' && u2 === 'kelvin') result = (v1 - 32) * 5/9 + 273.15;
            else if(u1 === 'kelvin' && u2 === 'celsius') result = v1 - 273.15;
            else if(u1 === 'kelvin' && u2 === 'fahrenheit') result = (v1 - 273.15) * 9/5 + 32;

            document.getElementById('val-right').value = result.toFixed(2);
            out.textContent = result.toFixed(2) + " " + u2;

        } else {
            out.textContent = "Temp Comparison/Math N/A";
        }
        return;
    }

    const f1 = unitData[currentType][u1];
    const f2 = unitData[currentType][u2];

    if(currentAction === 'convert') {
        const res = (v1 * f1) / f2;
        document.getElementById('val-right').value = res.toFixed(4);
        out.textContent = res.toFixed(4) + " " + u2;

    } else if (currentAction === 'compare') {

        const b1 = v1 * f1;
        const b2 = v2 * f2;

        if(Math.abs(b1 - b2) < 0.00001)
            out.textContent = "Exactly Equal";
        else
            out.textContent = b1 > b2 ? "Left is Larger" : "Right is Larger";

    } else {

        const ur = document.getElementById('unit-res').value;
        const fr = unitData[currentType][ur];

        const totalBase = (v1 * f1) + (v2 * f2);
        out.textContent = (totalBase / fr).toFixed(4);
    }
}