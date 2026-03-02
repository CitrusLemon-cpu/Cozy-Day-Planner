
// global variables used for drag-and-drop
let dragSrcEl = null;
let dragGroup = [];

/**
 * Adjust the indentation level of a list item.
 * @param {HTMLElement} li
 * @param {number} delta  +1 to indent, -1 to outdent
 */
function changeIndent(li, delta) {
    let lvl = parseInt(li.dataset.indentLevel || '0', 10);
    lvl = Math.max(0, Math.min(3, lvl + delta));
    li.dataset.indentLevel = lvl;
    li.classList.remove('indent-level-1', 'indent-level-2', 'indent-level-3');
    if (lvl > 0) li.classList.add('indent-level-' + lvl);
}

function handleDragStart(e) {
    dragSrcEl = this;
    dragGroup = [this];
    const baseLevel = parseInt(this.dataset.indentLevel || '0', 10);
    let next = this.nextSibling;
    while (next && parseInt(next.dataset.indentLevel || '0', 10) > baseLevel) {
        dragGroup.push(next);
        next = next.nextSibling;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', null); // required for Firefox
    dragGroup.forEach(el => el.classList.add('dragging'));
}

function handleDragEnd(e) {
    dragGroup.forEach(el => el.classList.remove('dragging'));
    dragGroup = [];
    dragSrcEl = null;
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (dragGroup.length && dragSrcEl !== this) {
        const list = this.parentNode;
        // determine whether to insert before or after based on pointer
        const rect = this.getBoundingClientRect();
        const after = e.clientY > rect.top + rect.height / 2;
        let insertBeforeNode = this;
        if (after && this.nextSibling) {
            insertBeforeNode = this.nextSibling;
        }
        // move entire group
        dragGroup.forEach(el => {
            list.insertBefore(el, insertBeforeNode);
        });
    }
    return false;
}

/**
 * Creates a new task item and appends it to the given list.
 * @param {HTMLElement} list  The <ul> element where the task should go.
 * @param {string} text      The task text.
 * @param {number} indentLevel 0 for no indent, higher values for deeper.
 */
function addTask(list, text, indentLevel = 0) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.setAttribute('draggable', 'true');
    li.tabIndex = 0; // allow keyboard focus for indenting

    // checkbox for completion (clicking the label no longer toggles state)
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'complete-checkbox';
    checkbox.addEventListener('change', function() {
        li.classList.toggle('completed', this.checked);
    });
    li.appendChild(checkbox);

    if (indentLevel > 0) {
        li.classList.add('indent-level-' + indentLevel);
        li.dataset.indentLevel = indentLevel;
    }

    // Create a span for the text so we can edit only that part
    const taskText = document.createElement('span');
    taskText.textContent = text;
    li.appendChild(taskText);

    // controls (outdent/indent buttons)
    const controls = document.createElement('span');
    controls.className = 'controls';
    const outdentBtn = document.createElement('button');
    outdentBtn.textContent = '←';
    outdentBtn.title = 'Outdent';
    outdentBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        changeIndent(li, -1);
    });
    const indentBtn = document.createElement('button');
    indentBtn.textContent = '→';
    indentBtn.title = 'Indent';
    indentBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        changeIndent(li, 1);
    });
    controls.appendChild(outdentBtn);
    controls.appendChild(indentBtn);
    li.appendChild(controls);

    // click on the list item focuses it (checkbox handles completion)
    li.addEventListener('click', function() {
        this.focus();
    });

    // double click to delete
    li.addEventListener('dblclick', function() {
        const confirmDelete = confirm("Delete this task?");
        if (confirmDelete) {
            this.remove();
        }
    });

    // right click to edit
    li.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const newText = prompt("Edit your task:", taskText.textContent);
        if (newText !== null && newText.trim() !== "") {
            taskText.textContent = newText;
        }
    });

    // drag & drop listeners
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragend', handleDragEnd);

    // keyboard support: Tab/Shift+Tab to change indent level when focused
    li.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                changeIndent(this, -1);
            } else {
                changeIndent(this, 1);
            }
        }
    });

    list.appendChild(li);
}

// basic task for restricted sections: checkbox, edit/delete but no indent/drag
function addTaskRestricted(list, text) {
    const li = document.createElement('li');
    li.className = 'task-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'complete-checkbox';
    checkbox.addEventListener('change', function() {
        li.classList.toggle('completed', this.checked);
    });
    li.appendChild(checkbox);

    const taskText = document.createElement('span');
    taskText.textContent = text;
    li.appendChild(taskText);

    li.addEventListener('click', function() {
        this.focus();
    });

    li.addEventListener('dblclick', function() {
        const confirmDelete = confirm("Delete this task?");
        if (confirmDelete) {
            this.remove();
        }
    });

    li.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const newText = prompt("Edit your task:", taskText.textContent);
        if (newText !== null && newText.trim() !== "") {
            taskText.textContent = newText;
        }
    });

    list.appendChild(li);
}

// initial behaviour for the three restricted task-inputs
document.querySelectorAll('.task-input').forEach(input => {
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.trim() !== "") {
            const parent = this.parentElement;
            const list = parent.querySelector('.task-list');
            const limit = parseInt(parent.getAttribute('data-limit'));

            if (list.children.length >= limit) {
                // Trigger Shake and Alert
                this.classList.add('shake');
                setTimeout(() => this.classList.remove('shake'), 400);
                alert("Don't over-plan! Focus on these 3 first.");
            } else {
                addTaskRestricted(list, this.value);
                this.value = "";
            }
        }
    });
});

// allow dropping onto the list itself (empty space) to append
document.querySelectorAll('.task-list').forEach(list => {
    list.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
    list.addEventListener('drop', function(e) {
        e.preventDefault();
        if (dragGroup.length) {
            dragGroup.forEach(el => this.appendChild(el));
        } else if (dragSrcEl) {
            this.appendChild(dragSrcEl);
        }
    });
});

// General Planning Logic (with multi‑level indent)
const genInput = document.getElementById('general-input');
const genList = document.getElementById('general-list');

// keep track of current indent level on the input element
genInput.dataset.indentLevel = 0;

genInput.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault(); // prevent focus move

        let level = parseInt(this.dataset.indentLevel, 10) || 0;
        if (e.shiftKey) {
            level = Math.max(0, level - 1);
        } else {
            level = Math.min(3, level + 1); // cap at 3 levels deep
        }
        this.dataset.indentLevel = level;
        this.style.paddingLeft = (10 + level * 30) + 'px';
    }

    if (e.key === 'Enter' && this.value.trim() !== "") {
        const level = parseInt(this.dataset.indentLevel, 10) || 0;
        addTask(genList, this.value, level);

        // Reset after adding
        this.value = "";
        this.dataset.indentLevel = 0;
        this.style.paddingLeft = "10px";
    }
});