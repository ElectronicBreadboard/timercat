pub struct WindowConfig;

impl WindowConfig {
    /// Main window size (width, height).
    pub fn main_size() -> (f64, f64) {
        return (400.0, 500.0);
    }

    /// Cat widget window size (width, height).
    pub fn cat_size() -> (f64, f64) {
        return (180.0, 220.0);
    }
}
