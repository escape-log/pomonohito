/**
 * 集中タイマー — app.js
 * 将来のログ機能追加を考慮し、状態管理・UI制御・タイマーロジックを分けて記述
 */

// ============================================================
// 1. 状態管理
// ============================================================
const State = {
  selectedMinutes: 25,   // 選択中の集中時間（25 or 50）
  goal: '',              // 今回の目標
  totalSeconds: 0,       // セッション総秒数
  remainingSeconds: 0,   // 残り秒数
  timerId: null,         // setInterval の ID
  isRunning: false,      // タイマー動作中フラグ
};

// ============================================================
// 2. DOM参照
// ============================================================
const DOM = {
  startScreen:     document.getElementById('start-screen'),
  timerScreen:     document.getElementById('timer-screen'),
  doneScreen:      document.getElementById('done-screen'),

  goalInput:       document.getElementById('goal-input'),
  charCount:       document.getElementById('char-count'),
  btn25:           document.getElementById('btn-25'),
  btn50:           document.getElementById('btn-50'),
  startBtn:        document.getElementById('start-btn'),

  sessionGoalText: document.getElementById('session-goal-text'),
  timerText:       document.getElementById('timer-text'),
  timerModeLabel:  document.getElementById('timer-mode-label'),
  ringProgress:    document.getElementById('ring-progress'),
  resetBtn:        document.getElementById('reset-btn'),

  doneGoalText:    document.getElementById('done-goal-text'),
  backBtn:         document.getElementById('back-btn'),
};

// SVGリングの円周（2π × r = 2π × 108 ≈ 678.58）
const RING_CIRCUMFERENCE = 2 * Math.PI * 108;

// ============================================================
// 3. 画面遷移
// ============================================================
function showScreen(screenEl) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  screenEl.classList.add('active');
}

// ============================================================
// 4. タイマー UI 更新
// ============================================================
function updateTimerUI() {
  const minutes = Math.floor(State.remainingSeconds / 60);
  const seconds = State.remainingSeconds % 60;
  DOM.timerText.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progress = State.remainingSeconds / State.totalSeconds;
  const offset = RING_CIRCUMFERENCE * (1 - progress);
  DOM.ringProgress.style.strokeDashoffset = offset;
}

// ============================================================
// 5. タイマーロジック
// ============================================================

// タイマー終了予定時刻（ms）
State.endEpoch = 0;

/**
 * Date.now() と終了予定時刻の差分から残り秒数を算出する。
 * バックグラウンド中に setInterval がスロットリングされても
 * 復帰時に正確な値を表示できる。
 */
function computeRemaining() {
  const diff = State.endEpoch - Date.now();
  return Math.max(0, Math.ceil(diff / 1000));
}

function tick() {
  const remaining = computeRemaining();
  State.remainingSeconds = remaining;
  updateTimerUI();

  if (remaining <= 0) {
    finishTimer();
  }
}

function startTimer() {
  State.totalSeconds = State.selectedMinutes * 60;
  State.endEpoch = Date.now() + State.totalSeconds * 1000;
  State.remainingSeconds = State.totalSeconds;
  State.isRunning = true;

  DOM.ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;
  DOM.ringProgress.style.strokeDashoffset = 0;
  DOM.sessionGoalText.textContent = State.goal;
  DOM.timerModeLabel.textContent = `${State.selectedMinutes}分 集中中`;
  updateTimerUI();

  showScreen(DOM.timerScreen);

  // ~250ms 間隔で tick することで、スロットリングされても
  // フォアグラウンド復帰直後に表示が追いつく
  State.timerId = setInterval(tick, 250);
}

function stopTimer() {
  clearInterval(State.timerId);
  State.timerId = null;
  State.isRunning = false;
}

function finishTimer() {
  stopTimer();
  DOM.doneGoalText.textContent = State.goal;

  // ログ機能拡張ポイント: ここでセッションデータを保存できる
  // saveLog({ goal: State.goal, minutes: State.selectedMinutes, completedAt: new Date() });

  showScreen(DOM.doneScreen);
}

function resetTimer() {
  stopTimer();
  resetStartScreen();
  showScreen(DOM.startScreen);
}

// ページが再びアクティブになったとき、即座に表示を同期する
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && State.isRunning) {
    tick();
  }
});

// ============================================================
// 6. スタート画面のリセット
// ============================================================
function resetStartScreen() {
  // 入力値はリセットせず、ユーザーが再利用しやすいようにする
  validateStartBtn();
}

// ============================================================
// 7. バリデーション
// ============================================================
function validateStartBtn() {
  const hasGoal = DOM.goalInput.value.trim().length > 0;
  DOM.startBtn.disabled = !hasGoal;
}

// ============================================================
// 8. イベントリスナー
// ============================================================

// 目標テキストボックス
DOM.goalInput.addEventListener('input', () => {
  const len = DOM.goalInput.value.length;
  DOM.charCount.textContent = `${len} / 100`;
  State.goal = DOM.goalInput.value.trim();
  validateStartBtn();
});

// モード選択ボタン
[DOM.btn25, DOM.btn50].forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    State.selectedMinutes = parseInt(btn.dataset.minutes, 10);
  });
});

// スタートボタン
DOM.startBtn.addEventListener('click', () => {
  if (DOM.startBtn.disabled) return;
  State.goal = DOM.goalInput.value.trim();
  startTimer();
});

// 中止ボタン
DOM.resetBtn.addEventListener('click', () => {
  // 誤タップ防止のため確認ダイアログを表示
  if (confirm('集中を中止して最初に戻りますか？')) {
    resetTimer();
  }
});

// 完了画面の戻るボタン
DOM.backBtn.addEventListener('click', () => {
  showScreen(DOM.startScreen);
});

// ============================================================
// 9. 初期化
// ============================================================
(function init() {
  validateStartBtn();
  DOM.ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;
})();
