const apiUrl = 'http://localhost:3000';

// ===== Auth Functions =====
async function signup(role = 'lifeguard') {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const telephone = document.getElementById('telephone').value;

    const res = await fetch(`${apiUrl}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, telephone, securityQuestion1: 'Your first pet?', securityAnswer1: 'dog', securityQuestion2: 'Your hometown?', securityAnswer2: 'city', role })
    });
    const data = await res.json();
    alert(data.message || data.error);
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const res = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
    });

    const data = await res.json();
    if (res.ok) {
        const code = prompt("Enter 2FA code sent to your email:");
        verify2FA(email, code);
    } else {
        alert(data.error || data.message);
    }
}

async function verify2FA(email, code) {
    const res = await fetch(`${apiUrl}/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
        credentials: 'include'
    });

    const data = await res.json();
    alert(data.message || data.error);
    if (res.ok) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('checklist-section').style.display = 'block';
        fetchChecklist();
    }
}

async function logout() {
    await fetch(`${apiUrl}/logout`, {
        method: 'POST',
        credentials: 'include'
    });
    alert('Logged out');
    document.getElementById('checklist-section').style.display = 'none';
    document.getElementById('auth-section').style.display = 'block';
}

// ===== Checklist CRUD =====
async function fetchChecklist() {
    const res = await fetch(`${apiUrl}/items`, { credentials: 'include' });
    const items = await res.json();
    const list = document.getElementById('checklist');
    if (list) {
        list.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.completed;
            checkbox.onchange = () => updateItem(item._id, item.name, checkbox.checked, initialsInput.value);

            const initialsInput = document.createElement('input');
            initialsInput.type = 'text';
            initialsInput.value = item.initials || '';
            initialsInput.className = 'initials-input';
            initialsInput.placeholder = 'Init';
            initialsInput.onblur = () => updateItem(item._id, item.name, checkbox.checked, initialsInput.value);

            const editBtn = document.createElement('button');
            editBtn.innerText = 'Edit';
            editBtn.onclick = () => {
                const newName = prompt('Edit item name:', item.name);
                if (newName) updateItem(item._id, newName, checkbox.checked, initialsInput.value);
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.innerText = 'Delete';
            deleteBtn.onclick = () => deleteItem(item._id);

            const nameSpan = document.createElement('span');
            nameSpan.innerText = item.name;

            li.appendChild(checkbox);
            li.appendChild(initialsInput);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
            li.appendChild(nameSpan);

            list.appendChild(li);
        });
    }
}

async function createItem() {
    const name = document.getElementById('newItem').value;
    await fetch(`${apiUrl}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
        credentials: 'include'
    });
    document.getElementById('newItem').value = '';
    fetchChecklist();
}

async function updateItem(id, name, completed, initials) {
    await fetch(`${apiUrl}/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, completed, initials }),
        credentials: 'include'
    });
    fetchChecklist();
}

async function deleteItem(id) {
    await fetch(`${apiUrl}/items/${id}`, {
        method: 'DELETE',
        credentials: 'include'
    });
    fetchChecklist();
}

// ===== Account Management =====
async function updateAccount() {
    const name = document.getElementById('accountName').value;
    const email = document.getElementById('accountEmail').value;
    const telephone = document.getElementById('accountTelephone').value;

    const res = await fetch(`${apiUrl}/account/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, telephone }),
        credentials: 'include'
    });
    const data = await res.json();
    alert(data.message || data.error);
}

async function changePassword() {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    const res = await fetch(`${apiUrl}/account/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
        credentials: 'include'
    });
    const data = await res.json();
    alert(data.message || data.error);
}

// ===== UI Functions =====
function showSignup() {
    document.getElementById('auth-section').scrollIntoView({ behavior: 'smooth' });
}

// res.cookie('token', token, {
//     httpOnly: true,
//     secure: true, // Only over HTTPS
//     sameSite: 'Strict'
// });
