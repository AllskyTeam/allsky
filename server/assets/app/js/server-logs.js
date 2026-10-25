(() => {
    const output = document.getElementById('server-log-output');
    if (!output) return;

    const status = document.getElementById('server-log-status');
    const followButton = document.getElementById('server-log-follow');
    const refreshButton = document.getElementById('server-log-refresh');
    let following = true;
    let loading = false;

    async function refreshLogs() {
        if (loading) return;
        loading = true;
        try {
            const response = await fetch('/logs/data', {cache: 'no-store', credentials: 'same-origin'});
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const atBottom = output.scrollHeight - output.scrollTop - output.clientHeight < 40;
            if (output.textContent !== data.lines) {
                output.textContent = data.lines || 'No server log entries found for this boot.';
                if (atBottom) output.scrollTop = output.scrollHeight;
            }
            status.textContent = `Updated ${new Date().toLocaleTimeString()}`;
        } catch (error) {
            following = false;
            followButton.textContent = 'Resume following';
            status.textContent = `Could not load logs (${error.message}). Use Refresh now to retry.`;
        } finally {
            loading = false;
        }
    }

    followButton.addEventListener('click', () => {
        following = !following;
        followButton.textContent = following ? 'Pause following' : 'Resume following';
        if (following) refreshLogs();
    });
    refreshButton.addEventListener('click', refreshLogs);
    document.addEventListener('visibilitychange', () => {
        if (following && !document.hidden) refreshLogs();
    });

    refreshLogs();
    setInterval(() => {
        if (following && !document.hidden) refreshLogs();
    }, 3000);
})();
