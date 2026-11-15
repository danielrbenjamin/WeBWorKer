const settle = async () => {
    for (let i = 0; i < 4; i++) await new Promise(resolve => requestAnimationFrame(resolve));
};
document.getElementById('run').addEventListener('click', async () => {
    const report = document.getElementById('report');
    const results = [];
    const check = (name, condition) => {
        if (!condition) throw new Error(name);
        results.push('PASS: ' + name);
    };
    const visible = selector => getComputedStyle(document.querySelector(selector)).display !== 'none';
    const message = type => chrome.tabs.sendMessage(1, { type });
    const answer = document.getElementById('AnSwEr0001');
    const select = document.querySelector('select');
    const radio = document.querySelector('input[type="radio"]');
    try {
        await settle();
        check('Study Mode controls start available without hiding answers', visible('.correct_answer') && answer.value === '42' && !!document.getElementById('wwh-panel'));
        check('Only the Turn on study mode button is shown initially', document.querySelector('#wwh-panel [data-action="peek"]').hidden && document.querySelector('#wwh-panel [data-action="site"]').textContent === 'Turn on study mode');
        await SpoilerGuardConfig.save({ enabled: false });
        await settle();
        check('Turning Study Mode off restores answers and removes its controls', visible('.correct_answer') && answer.value === '42' && !document.getElementById('wwh-panel'));
        await SpoilerGuardConfig.save({ enabled: true });
        await settle();
        check('Re-enabling controls does not activate practice', visible('.correct_answer') && answer.value === '42');
        await message('wwh-toggle-site');
        await settle();
        check('Enabled mode hides answers, feedback, solutions and scores', ['.correct_answer', '.answer-correct', '.solution', '.progress'].every(s => !visible(s)));
        check('Old text, select and radio answers are cleared locally', answer.value === '' && select.selectedIndex === -1 && !radio.checked && radio.value === 'a');
        check('MathQuill mirror is cleared', document.querySelector('.mq-root-block').textContent === '');
        check('Reveal parameters are stripped without losing other parameters', !document.getElementById('next').href.includes('showCorrectAnswers') && document.getElementById('next').href.includes('other=keep'));
        check('Form data excludes reveal requests', !new FormData(document.querySelector('form')).has('showSolutions'));
        await message('wwh-peek');
        await settle();
        check('Peek reveals content and restores untouched answers', visible('.correct_answer') && answer.value === '42' && select.value === 'b' && radio.checked);
        check('Peek restores the MathQuill mirror and navigation', document.querySelector('.mq-root-block').textContent === 'x²' && document.getElementById('next').href.includes('showSolutions'));
        await message('wwh-peek');
        await SpoilerGuardConfig.save({ mode: 'blur', answers: false });
        await settle();
        check('Blur respects disabled answer category', visible('.correct_answer') && getComputedStyle(document.querySelector('.correct_answer')).filter === 'none');
        check('Blur covers all selectors in enabled categories', getComputedStyle(document.querySelector('.answer-correct')).filter === 'blur(6px)');
        await SpoilerGuardConfig.save({ mode: 'hide', answers: true });
        document.querySelector('#results tbody').insertAdjacentHTML('beforeend', '<tr id="dynamic-row"><td>2</td><td>99</td><td>50%</td></tr>');
        await settle();
        check('New table rows receive spoiler hiding', getComputedStyle(document.querySelector('#dynamic-row td:nth-child(2)')).display === 'none');
        await SpoilerGuardConfig.save({ extraSelectors: '.custom-spoiler' });
        await settle();
        check('Custom selectors hide matching content', !visible('.custom-spoiler'));
        await SpoilerGuardConfig.save({ extraSelectors: '' });
        await settle();
        check('Removing a custom selector restores its content', visible('.custom-spoiler'));
        await message('wwh-toggle-site');
        await settle();
        check('Per-site pause restores original content and answers', visible('.correct_answer') && answer.value === '42');
        await message('wwh-toggle-site');
        await settle();
        check('Per-site resume hides content again', !visible('.correct_answer') && answer.value === '');
        let unrelatedResponse = false;
        chrome.runtime.onMessage.addListener((message, sender, respond) => {
            if (message.type === 'weworker.captureVisibleTab') { unrelatedResponse = true; respond({ ok: true, image: 'capture' }); }
        });
        check('Screenshot messages reach their own handler', (await message('weworker.captureVisibleTab')).image === 'capture' && unrelatedResponse);
        report.textContent = results.join('\n') + '\n\n' + results.length + ' checks passed. Enter a new answer, then toggle Peek to verify real edits stay intact.';
        report.dataset.result = 'pass';
    } catch (error) {
        report.textContent = results.join('\n') + '\nFAIL: ' + error.message;
        report.dataset.result = 'fail';
    }
});
