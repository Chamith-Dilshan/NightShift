use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq)]
pub struct ParsedProgress {
    pub out_time_ms: u64,
    pub frame: Option<u64>,
    pub fps: Option<f32>,
    pub speed: Option<f32>,
    pub bitrate_kbps: Option<f32>,
    pub size_bytes: Option<u64>,
    pub percent: Option<f32>,
    pub is_end: bool,
}

pub struct ProgressParser {
    current_block: HashMap<String, String>,
}

impl ProgressParser {
    pub fn new() -> Self {
        Self {
            current_block: HashMap::new(),
        }
    }

    pub fn feed_line(&mut self, line: &str, duration_ms: Option<u64>) -> Option<ParsedProgress> {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return None;
        }

        if let Some((k, v)) = trimmed.split_once('=') {
            let key = k.trim().to_string();
            let value = v.trim().to_string();

            if key == "progress" {
                let is_end = value == "end";
                let parsed = self.finalize_block(duration_ms, is_end);
                self.current_block.clear();
                return Some(parsed);
            } else {
                self.current_block.insert(key, value);
            }
        }

        None
    }

    fn finalize_block(&self, duration_ms: Option<u64>, is_end: bool) -> ParsedProgress {
        let out_time_ms = if let Some(us_str) = self.current_block.get("out_time_us") {
            us_str.parse::<i64>().unwrap_or(0).max(0) as u64 / 1000
        } else if let Some(ms_str) = self.current_block.get("out_time_ms") {
            // Note: FFmpeg out_time_ms is actually in microseconds
            ms_str.parse::<i64>().unwrap_or(0).max(0) as u64 / 1000
        } else if let Some(time_str) = self.current_block.get("out_time") {
            parse_hhmmss_to_ms(time_str).unwrap_or(0)
        } else {
            0
        };

        let frame = self
            .current_block
            .get("frame")
            .and_then(|s| s.parse::<u64>().ok());

        let fps = self
            .current_block
            .get("fps")
            .and_then(|s| s.parse::<f32>().ok());

        let speed = self.current_block.get("speed").and_then(|s| {
            let clean = s.trim_end_matches('x').trim();
            clean.parse::<f32>().ok()
        });

        let bitrate_kbps = self.current_block.get("bitrate").and_then(|s| {
            let clean = s
                .trim_end_matches("kbits/s")
                .trim_end_matches("kbit/s")
                .trim_end_matches('k')
                .trim();
            clean.parse::<f32>().ok()
        });

        let size_bytes = self
            .current_block
            .get("total_size")
            .and_then(|s| s.parse::<i64>().ok())
            .and_then(|v| if v >= 0 { Some(v as u64) } else { None });

        let percent = match duration_ms {
            Some(d) if d > 0 => {
                let p = (out_time_ms as f32 / d as f32) * 100.0;
                Some(p.clamp(0.0, 100.0))
            }
            _ => None,
        };

        ParsedProgress {
            out_time_ms,
            frame,
            fps,
            speed,
            bitrate_kbps,
            size_bytes,
            percent,
            is_end,
        }
    }
}

impl Default for ProgressParser {
    fn default() -> Self {
        Self::new()
    }
}

fn parse_hhmmss_to_ms(s: &str) -> Option<u64> {
    let parts: Vec<&str> = s.split(':').collect();
    if parts.len() != 3 {
        return None;
    }
    let hours: u64 = parts[0].parse().ok()?;
    let minutes: u64 = parts[1].parse().ok()?;
    let seconds_f: f64 = parts[2].parse().ok()?;
    let total_sec = (hours * 3600 + minutes * 60) as f64 + seconds_f;
    Some((total_sec * 1000.0).round() as u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_progress_block() {
        let mut parser = ProgressParser::new();
        let lines = [
            "frame=100",
            "fps=25.5",
            "bitrate= 1200.5kbits/s",
            "total_size=500000",
            "out_time_us=2000000",
            "speed=1.5x",
            "progress=continue",
        ];

        let mut res = None;
        for line in lines {
            if let Some(p) = parser.feed_line(line, Some(4000)) {
                res = Some(p);
            }
        }

        let p = res.expect("should produce progress");
        assert_eq!(p.out_time_ms, 2000);
        assert_eq!(p.frame, Some(100));
        assert_eq!(p.fps, Some(25.5));
        assert_eq!(p.speed, Some(1.5));
        assert_eq!(p.bitrate_kbps, Some(1200.5));
        assert_eq!(p.size_bytes, Some(500000));
        assert_eq!(p.percent, Some(50.0));
        assert!(!p.is_end);
    }

    #[test]
    fn test_parse_progress_end() {
        let mut parser = ProgressParser::new();
        let lines = [
            "frame=200",
            "out_time_ms=4000000", // microsecond representation in ffmpeg
            "progress=end",
        ];

        let mut res = None;
        for line in lines {
            if let Some(p) = parser.feed_line(line, Some(4000)) {
                res = Some(p);
            }
        }

        let p = res.expect("should produce progress");
        assert_eq!(p.out_time_ms, 4000);
        assert_eq!(p.percent, Some(100.0));
        assert!(p.is_end);
    }

    #[test]
    fn test_parse_hhmmss() {
        assert_eq!(parse_hhmmss_to_ms("00:01:30.500"), Some(90500));
    }
}
