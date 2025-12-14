document.addEventListener('DOMContentLoaded', () => {
            
    // --- CORE CONFIGURATION & DATA ---
    
    const ADMIN_PASSWORD = "akash"; 
    const SESSION_DURATION = 30 * 60 * 1000; 
    let isStarManagementLocked = true;
    let sessionExpirationTime = null;
    let sessionTimerInterval = null;

    const QUOTES = [
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
        { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
        { text: "Intelligence plus character—that is the goal of true education.", author: "Martin Luther King Jr." }
    ];
    
    const CHARACTERS = {
        getAvatar: function(gender) {
            if (gender && gender.toLowerCase() === 'male') return '🧑';
            if (gender && gender.toLowerCase() === 'female') return '👧';
            return '👤';
        }
    };

    const DEMO_STUDENTS = [
        { id: 's901', name: 'Amrata Kanwar', class: '9', roll: 901, stars: 5, dob: '2011-02-03', gender: 'female', avatar: CHARACTERS.getAvatar('female'), badges: [] },
        { id: 's902', name: 'Arun Singh Solanki', class: '9', roll: 902, stars: 12, dob: '2011-08-03', gender: 'male', avatar: CHARACTERS.getAvatar('male'), badges: [] },
        { id: 's906', name: 'Chanchal Kunwar Chouhan', class: '9', roll: 906, stars: 15, dob: '2011-03-08', gender: 'female', avatar: CHARACTERS.getAvatar('female'), badges: [] },
        { id: 's910', name: 'DIMPAL RAWAT', class: '9', roll: 910, stars: 9, dob: '2012-06-26', gender: 'female', avatar: CHARACTERS.getAvatar('female'), badges: [] },
        { id: 's1001', name: 'Ajay Singh Kitawat', class: '10', roll: 1001, stars: 10, dob: '2010-12-22', gender: 'male', avatar: CHARACTERS.getAvatar('male'), badges: [] },
        { id: 's1004', name: 'Apeksha Rao', class: '10', roll: 1004, stars: 18, dob: '2010-01-13', gender: 'female', avatar: CHARACTERS.getAvatar('female'), badges: [] },
        { id: 's1040', name: 'RAVINA GURJAR', class: '10', roll: 1040, stars: 19, dob: '2010-12-01', gender: 'female', avatar: CHARACTERS.getAvatar('female'), badges: [] },
        { id: 's1047', name: 'YUVRAJ SINGH', class: '10', roll: 1047, stars: 20, dob: '2011-11-26', gender: 'male', avatar: CHARACTERS.getAvatar('male'), badges: [] },
    ];


    // Initialize App Data
    let students = JSON.parse(localStorage.getItem('students')) || DEMO_STUDENTS;
    let starHistory = JSON.parse(localStorage.getItem('starHistory')) || [];
    let currentFilter = 'All'; 
    
    // --- ELEMENT REFERENCES ---
    const studentModal = document.getElementById('student-modal');
    const passwordModal = document.getElementById('password-modal');
    const starLockStatusDiv = document.getElementById('star-lock-status');
    const passwordInput = document.getElementById('star-password');
    const passwordSubmitBtn = document.getElementById('password-submit');
    const passwordMessage = document.getElementById('password-message');
    
    // Audio References
    const bgmAudio = document.getElementById('bgm');
    const tickAudio = document.getElementById('tick-sound');
    const correctAudio = document.getElementById('correct-sound');
    const incorrectAudio = document.getElementById('incorrect-sound');


    // --- GENERAL & UI MANAGEMENT ---
    
    const saveData = () => {
        localStorage.setItem('students', JSON.stringify(students));
        localStorage.setItem('starHistory', JSON.stringify(starHistory)); 
    };

    // Sidebar Navigation Handler
    document.querySelectorAll('#sidebar nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            document.querySelectorAll('.app-section').forEach(section => {
                section.classList.add('hidden');
            });
            
            const targetSectionId = e.target.dataset.section;
            const targetSection = document.getElementById(targetSectionId);
            if (targetSection) {
                targetSection.classList.remove('hidden');
            } 
            
            document.querySelectorAll('#sidebar nav a').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
            
            if (targetSectionId !== 'quiz-section') {
                bgmAudio.pause();
                bgmAudio.currentTime = 0;
            }

            if (targetSectionId === 'whiteboard-section') {
                setCanvasSize(); 
            } else if (targetSectionId === 'student-manager-section') {
                filterStudentsByClass(currentFilter); 
            }
        });
    });

    // --- MODAL HANDLERS ---
    
    const closeModal = (modalElement) => {
        if (modalElement) {
            modalElement.style.display = 'none';
        }
    }

    document.querySelectorAll('.modal .close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal);
        });
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === studentModal) {
            closeModal(studentModal);
        }
    });

    // --- SESSION MANAGEMENT ---

    const updateLockUI = () => {
        const buttons = document.querySelectorAll('.star-controls button');
        
        if (isStarManagementLocked) {
            starLockStatusDiv.classList.add('locked');
            starLockStatusDiv.classList.remove('unlocked');
            starLockStatusDiv.innerHTML = `Star Management is **LOCKED**. Click to enter password.`;
            buttons.forEach(btn => btn.classList.add('disabled'));
        } else {
            const timeLeft = Math.max(0, sessionExpirationTime - Date.now());
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);

            starLockStatusDiv.classList.remove('locked');
            starLockStatusDiv.classList.add('unlocked');
            starLockStatusDiv.innerHTML = `Star Management is **UNLOCKED**. Session expires in ${minutes}m ${seconds}s.`;
            buttons.forEach(btn => btn.classList.remove('disabled'));
        }
    };
    
    const startSessionTimer = () => {
        if (sessionTimerInterval) clearInterval(sessionTimerInterval);
        
        sessionTimerInterval = setInterval(() => {
            if (Date.now() >= sessionExpirationTime) {
                lockStarManagement();
            } else {
                updateLockUI();
            }
        }, 1000);
    };

    const unlockStarManagement = () => {
        isStarManagementLocked = false;
        sessionExpirationTime = Date.now() + SESSION_DURATION;
        closeModal(passwordModal);
        passwordInput.value = '';
        passwordMessage.textContent = '';
        
        filterStudentsByClass(currentFilter); 
        updateLockUI();
        startSessionTimer();
    };

    const lockStarManagement = () => {
        isStarManagementLocked = true;
        sessionExpirationTime = null;
        clearInterval(sessionTimerInterval);
        
        filterStudentsByClass(currentFilter); 
        updateLockUI();
    };

    starLockStatusDiv.addEventListener('click', () => {
        if (isStarManagementLocked) {
            passwordMessage.textContent = 'Enter the administrative password.';
            passwordModal.style.display = 'block';
            passwordInput.focus();
        }
    });

    passwordSubmitBtn.addEventListener('click', () => {
        if (passwordInput.value === ADMIN_PASSWORD) {
            unlockStarManagement();
        } else {
            passwordMessage.textContent = 'Incorrect Password. Please try again.';
            passwordInput.value = '';
            passwordInput.focus();
        }
    });

    // --- DASHBOARD LOGIC ---
    
    const renderDashboard = () => {
        const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        document.getElementById('quote-box').innerHTML = `"${randomQuote.text}" — <em>${randomQuote.author}</em>`;

        const sortedStudents = [...students].sort((a, b) => b.stars - a.stars);
        
        const renderLeaderboard = (listId, topStudents) => {
            const listEl = document.getElementById(listId);
            listEl.innerHTML = topStudents.slice(0, 5).map((s, index) => 
                `<li class="${index === 0 ? 'rank-1' : ''}">
                    <span style="font-weight:700;">#${index + 1}:</span> ${s.name}
                    <span>${s.stars} ⭐</span>
                </li>`
            ).join('') || '<li>No data yet.</li>';
        };
        
        renderLeaderboard('sow-list', sortedStudents);
        renderLeaderboard('som-list', sortedStudents);
        renderLeaderboard('sos-list', sortedStudents);
    };

    // --- STUDENT MANAGER LOGIC ---

    const calculateAge = (dob) => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const generateAiNickname = (name, stars) => {
        const starLevel = Math.min(Math.floor(stars / 5) || 1, 5);
        const firstWord = name.split(' ')[0];
        let prefix = '';
        
        switch(starLevel) {
            case 5: prefix = 'The Legendary '; break;
            case 4: prefix = 'The Brilliant '; break;
            case 3: prefix = 'The Rising '; break;
            case 2: prefix = 'The Quick '; break;
            default: prefix = 'The Focused '; break;
        }

        const suffix = ['Ace', 'Prodigy', 'Maestro', 'Innovator', 'Thinker'][Math.floor(Math.random() * 5)];
        return `${prefix}${firstWord}-${suffix}`;
    };

    const openStudentProfile = (student) => {
        const profileDetails = document.getElementById('profile-details');
        const age = calculateAge(student.dob);
        const nickname = generateAiNickname(student.name, student.stars);
        
        const studentLogs = starHistory.filter(log => log.studentId === student.id);
        const totalDeductions = studentLogs.filter(log => log.change < 0).reduce((sum, log) => sum + log.change, 0);
        const totalAwards = studentLogs.filter(log => log.change > 0).reduce((sum, log) => sum + log.change, 0);
        
        profileDetails.innerHTML = `
            <h3>${student.avatar} ${student.name} <span class="nickname">(${nickname})</span></h3>
            <div class="profile-stat-grid">
                <div><strong>Class:</strong> ${student.class}</div>
                <div><strong>Roll No:</strong> ${student.roll}</div>
                <div><strong>DOB:</strong> ${student.dob}</div>
                <div><strong>Age:</strong> ${age} years</div>
                <div><strong>Gender:</strong> ${student.gender.toUpperCase()}</div>
                <div><strong>Badges Earned:</strong> ${student.badges.length || 0}</div>
                <div style="grid-column: 1 / span 2;"><strong>Current Stars:</strong> <span style="color: gold; font-size: 1.5em; text-shadow: 1px 1px #555;">${student.stars} ⭐</span></div>
                <div style="color: var(--secondary-color);"><strong>Total Stars Awarded:</strong> ${totalAwards}</div>
                <div style="color: var(--danger-color);"><strong>Total Stars Deducted:</strong> ${Math.abs(totalDeductions)}</div>
            </div>
        `;
        
        studentModal.style.display = 'block';
    };


    const createStudentCard = (student) => {
        const card = document.createElement('div');
        card.className = 'student-card';
        card.dataset.id = student.id;
        card.dataset.gender = student.gender; 

        const disabledClass = isStarManagementLocked ? 'disabled' : '';

        card.innerHTML = `
            <div class="avatar">${student.avatar}</div>
            <div class="info">
                <h4>${student.name}</h4>
                <p>Class: ${student.class} | Roll No: ${student.roll}</p>
            </div>
            <div class="star-controls">
                <button class="remove-star ${disabledClass}" data-id="${student.id}" title="${isStarManagementLocked ? 'Requires session unlock' : 'Deduct Star'}">-1</button>
                <span class="star-count" id="stars-${student.id}">${student.stars} ⭐</span>
                <button class="add-star ${disabledClass}" data-id="${student.id}" title="${isStarManagementLocked ? 'Requires session unlock' : 'Award Star'}">+1</button>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.star-controls')) {
                openStudentProfile(student);
            }
        });
        
        card.querySelector('.add-star').addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isStarManagementLocked) updateStars(student.id, 1);
        });
        card.querySelector('.remove-star').addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isStarManagementLocked) updateStars(student.id, -1);
        });

        return card;
    };

    const updateStars = (id, change) => {
        if (isStarManagementLocked) return;

        const studentIndex = students.findIndex(s => s.id === id);
        if (studentIndex === -1) return;

        const student = students[studentIndex];
        const newStars = Math.max(0, student.stars + change);

        const reason = change > 0 ? 'Teacher Award' : 'Penalty/Deduction';
        
        student.stars = newStars;
        
        const logEntry = {
            studentId: id,
            studentName: student.name,
            change: change,
            newStars: newStars,
            reason: reason,
            timestamp: new Date().toLocaleString(),
            type: change > 0 ? 'add' : 'remove'
        };
        starHistory.unshift(logEntry);
        
        const starSpan = document.getElementById(`stars-${id}`);
        if (starSpan) {
            starSpan.textContent = `${newStars} ⭐`;
        }

        saveData();
        renderDashboard(); 
        updateLockUI(); 
    };

    const renderStudentList = (studentArray) => {
        const maleList = document.getElementById('male-student-list');
        const femaleList = document.getElementById('female-student-list');
        const maleCountSpan = document.getElementById('male-count');
        const femaleCountSpan = document.getElementById('female-count');
        
        maleList.innerHTML = '';
        femaleList.innerHTML = '';
        let maleCount = 0;
        let femaleCount = 0;

        studentArray.forEach(student => {
            const studentCard = createStudentCard(student); 
            
            if (student.gender.toLowerCase() === 'male') {
                maleList.appendChild(studentCard);
                maleCount++;
            } else if (student.gender.toLowerCase() === 'female') {
                femaleList.appendChild(studentCard);
                femaleCount++;
            }
        });

        maleCountSpan.textContent = maleCount;
        femaleCountSpan.textContent = femaleCount;
        updateLockUI(); 
    };

    const filterStudentsByClass = (filter) => {
        currentFilter = filter;
        document.querySelectorAll('.class-filter-tabs button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`filter-${filter.toLowerCase().replace(/\s/g, '-')}`).classList.add('active');

        let filteredStudents = students;
        if (filter !== 'All') {
            filteredStudents = students.filter(s => s.class === filter);
        }
        renderStudentList(filteredStudents);
    };

    document.getElementById('filter-all').addEventListener('click', () => filterStudentsByClass('All'));
    document.getElementById('filter-class-9').addEventListener('click', () => filterStudentsByClass('9'));
    document.getElementById('filter-class-10').addEventListener('click', () => filterStudentsByClass('10'));


    // --- WHITEBOARD LOGIC ---
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');
    const colorPicker = document.getElementById('color-picker');
    const sizeSlider = document.getElementById('size-slider');
    const penToolBtn = document.getElementById('tool-pen');
    const eraserToolBtn = document.getElementById('tool-eraser');

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentTool = 'pen'; 

    const setCanvasSize = () => {
        const container = document.getElementById('whiteboard-section');
        const controls = document.querySelector('.whiteboard-controls');
        
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight - controls.offsetHeight;
        
        ctx.lineWidth = sizeSlider.value;
        ctx.lineCap = 'round';
    };

    const getCoords = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
        const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };
    
    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        
        const coords = getCoords(e);

        if (currentTool === 'pen') {
            ctx.strokeStyle = colorPicker.value;
            ctx.globalCompositeOperation = 'source-over';
        } else if (currentTool === 'eraser') {
            ctx.strokeStyle = '#ffffff'; 
            ctx.globalCompositeOperation = 'destination-out';
        }

        ctx.lineWidth = sizeSlider.value;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        
        lastX = coords.x;
        lastY = coords.y;
    };

    const startDrawing = (e) => {
        isDrawing = true;
        const coords = getCoords(e);
        lastX = coords.x;
        lastY = coords.y;
    };
    
    const stopDrawing = () => {
        isDrawing = false;
    };
    
    const setTool = (tool) => {
        currentTool = tool;
        penToolBtn.classList.remove('active');
        eraserToolBtn.classList.remove('active');
        document.getElementById(`tool-${tool}`).classList.add('active');
        canvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
    };

    penToolBtn.addEventListener('click', () => setTool('pen'));
    eraserToolBtn.addEventListener('click', () => setTool('eraser'));

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', (e) => {
        if (e.target === canvas) e.preventDefault();
        startDrawing(e);
    }, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    document.getElementById('clear-whiteboard-btn').addEventListener('click', () => {
        const oldWidth = canvas.width;
        const oldHeight = canvas.height;
        ctx.clearRect(0, 0, oldWidth, oldHeight);
        setCanvasSize(); 
    });
    
    window.addEventListener('resize', () => {
        if (!document.getElementById('whiteboard-section').classList.contains('hidden')) {
            setCanvasSize();
        }
    });


    // --- QUIZ LOGIC ---
    
    const scienceQuiz = [
        { question: "Which organelle is the powerhouse of the cell?", options: ["Ribosome", "Nucleus", "Mitochondria", "Cell Wall"], answer: "Mitochondria" },
        { question: "What is the unit of electric current?", options: ["Volt", "Ohm", "Ampere", "Watt"], answer: "Ampere" },
        { question: "Which metal is liquid at room temperature?", options: ["Gold", "Silver", "Mercury", "Copper"], answer: "Mercury" },
        { question: "What process do plants use to make food?", options: ["Respiration", "Transpiration", "Fermentation", "Photosynthesis"], answer: "Photosynthesis" },
        { question: "What is the chemical symbol for table salt?", options: ["KCl", "H2O", "NaCl", "CO2"], answer: "NaCl" },
        { question: "What is the hardest natural substance on Earth?", options: ["Iron", "Quartz", "Diamond", "Tungsten"], answer: "Diamond" }
    ];

    let quizState = {
        currentQuestionIndex: 0,
        score: 0,
        timerSeconds: 30,
        intervalId: null
    };

    const quizTimer = document.querySelector('#quiz-timer span');
    const quizFeedback = document.getElementById('quiz-feedback');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const questionText = document.getElementById('question-text');
    const questionNumber = document.getElementById('question-number');
    const quizOptions = document.getElementById('quiz-options');


    const resetQuiz = () => {
        quizState.currentQuestionIndex = 0;
        quizState.score = 0;
        clearInterval(quizState.intervalId);
        quizTimer.textContent = '30';
        quizFeedback.classList.add('hidden');
        startQuizBtn.classList.remove('hidden');
        questionText.textContent = "Click 'Start Quiz' to begin the Science Challenge!";
        questionNumber.textContent = "Question 1";
        quizOptions.innerHTML = '';
        bgmAudio.pause();
        tickAudio.pause();
    };
    
    const startQuiz = () => {
        resetQuiz();
        startQuizBtn.classList.add('hidden');
        
        bgmAudio.volume = 0.4; 
        bgmAudio.play().catch(e => console.log("BGM Playback blocked: " + e));
        
        loadQuestion(quizState.currentQuestionIndex);
    };

    const startTimer = () => {
        clearInterval(quizState.intervalId);
        quizState.timerSeconds = 30;
        quizTimer.textContent = quizState.timerSeconds;
        
        quizState.intervalId = setInterval(() => {
            quizState.timerSeconds--;
            quizTimer.textContent = quizState.timerSeconds;

            if (quizState.timerSeconds <= 10 && quizState.timerSeconds > 0) {
                quizTimer.style.color = 'var(--danger-color)';
                tickAudio.play();
            } else if (quizState.timerSeconds <= 0) {
                clearInterval(quizState.intervalId);
                handleAnswer(null); 
                tickAudio.pause();
            } else {
                quizTimer.style.color = 'gold';
            }
        }, 1000);
    };

    const loadQuestion = (index) => {
        if (index >= scienceQuiz.length) {
            endQuiz();
            return;
        }
        
        const q = scienceQuiz[index];
        questionNumber.textContent = `Question ${index + 1} / ${scienceQuiz.length}`;
        questionText.textContent = q.question;
        quizOptions.innerHTML = '';
        quizFeedback.classList.add('hidden');
        startTimer();

        q.options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = option;
            btn.addEventListener('click', () => handleAnswer(option, btn));
            quizOptions.appendChild(btn);
        });
    };

    const handleAnswer = (selectedOption, button) => {
        clearInterval(quizState.intervalId);
        bgmAudio.pause();
        tickAudio.pause();

        const currentQ = scienceQuiz[quizState.currentQuestionIndex];
        const isCorrect = selectedOption === currentQ.answer;

        document.querySelectorAll('#quiz-options .option-btn').forEach(btn => btn.disabled = true);
        
        quizFeedback.classList.remove('hidden');
        if (isCorrect) {
            correctAudio.play();
            quizFeedback.textContent = "✅ CORRECT! Well done!";
            quizFeedback.style.color = 'var(--secondary-color)';
            if (button) button.classList.add('correct');
            quizState.score += 1;
            

        } else {
            incorrectAudio.play();
            quizFeedback.textContent = selectedOption ? "❌ INCORRECT! The correct answer is highlighted." : "⏳ TIME IS UP!";
            quizFeedback.style.color = 'var(--danger-color)';
            if (button) button.classList.add('incorrect');
            
            document.querySelectorAll('#quiz-options .option-btn').forEach(btn => {
                if (btn.textContent === currentQ.answer) {
                    btn.classList.add('correct');
                }
            });
        }
        
        setTimeout(() => {
            quizState.currentQuestionIndex++;
            loadQuestion(quizState.currentQuestionIndex);
        }, 3000); 
    };

    const endQuiz = () => {
        bgmAudio.pause();
        clearInterval(quizState.intervalId);
        questionText.textContent = `Quiz Finished! Your Score: ${quizState.score} out of ${scienceQuiz.length}.`;
        questionNumber.textContent = `Great Job!`;
        quizOptions.innerHTML = '';
        quizFeedback.classList.add('hidden');
        startQuizBtn.textContent = 'Play Again';
        startQuizBtn.classList.remove('hidden');
    };

    startQuizBtn.addEventListener('click', startQuiz);


    // --- INITIALIZATION ---
    
    lockStarManagement(); 
    renderDashboard();
    filterStudentsByClass(currentFilter);
    setTool('pen'); 

});
