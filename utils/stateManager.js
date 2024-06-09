const stateStack = {};

const pushState = (chatId, state) => {
    if (!stateStack[chatId]) {
        stateStack[chatId] = [];
    }
    stateStack[chatId].push(state);
};

const popState = (chatId) => {
    if (stateStack[chatId] && stateStack[chatId].length > 0) {
        return stateStack[chatId].pop();
    }
    return null;
};

module.exports = { pushState, popState };
