pub struct WindowConfig;

impl WindowConfig {
    /// Main window size (width, height).
    pub fn main_size() -> (f64, f64) {
        return (300.0, 500.0);
    }

    /// Cat widget window size (width, height).
    pub fn cat_size() -> (f64, f64) {
        return (180.0, 220.0);
    }

    /// Settings window size (width, height).
    pub fn settings_size() -> (f64, f64) {
        return (600.0, 450.0);
    }

    /// Settings window minimum size (width, height).
    pub fn settings_min_size() -> (f64, f64) {
        return (500.0, 400.0);
    }
}
