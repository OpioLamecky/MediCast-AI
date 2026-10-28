export function getSavedConversations() {
  try {
    const stored = localStorage.getItem('medicast_convos');
    let convos = stored ? JSON.parse(stored) : [];
    const now = Date.now();
    const eightHours = 8 * 60 * 60 * 1000;
    convos = convos.filter(c => {
      const timestamp = parseInt(c.id);
      return !isNaN(timestamp) ? (now - timestamp < eightHours) : true;
    });
    localStorage.setItem('medicast_convos', JSON.stringify(convos));
    return convos;
  } catch (e) {
    console.error('Failed to load conversations:', e);
    return [];
  }
}

export function saveConversations(convos) {
  try {
    localStorage.setItem('medicast_convos', JSON.stringify(convos));
    window.dispatchEvent(new Event('medicast_convos_changed'));
  } catch (e) {
    console.error('Failed to save conversations:', e);
  }
}

export function createNewChat() {
  const newConvo = {
    id: Date.now().toString(),
    metadata: { name: 'New Surgical Discussion', description: 'AI surgery analysis consultation' },
    messages: []
  };
  const current = getSavedConversations();
  const updated = [newConvo, ...current];
  saveConversations(updated);
  return newConvo;
}
