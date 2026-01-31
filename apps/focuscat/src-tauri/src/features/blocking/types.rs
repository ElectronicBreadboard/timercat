use super::checker::BlockingChecker;
use std::ops::Deref;
use std::sync::Mutex;

// MARK: - State

pub struct BlockingCheckerState(Mutex<BlockingChecker>);

impl BlockingCheckerState {
    pub fn new() -> Self {
        return Self(Mutex::new(BlockingChecker::empty()));
    }
}

impl Deref for BlockingCheckerState {
    type Target = Mutex<BlockingChecker>;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}
