pub struct LineSplitter {
    buffer: Vec<u8>,
    pending_cr: bool,
}

impl LineSplitter {
    pub fn new() -> Self {
        Self {
            buffer: Vec::new(),
            pending_cr: false,
        }
    }

    pub fn feed(&mut self, chunk: &[u8]) -> Vec<String> {
        let mut lines = Vec::new();
        let mut i = 0;

        if self.pending_cr {
            self.pending_cr = false;
            if !chunk.is_empty() && chunk[0] == b'\n' {
                // The \r was followed by \n across chunk boundary; consume \n
                let line = String::from_utf8_lossy(&self.buffer).to_string();
                self.buffer.clear();
                lines.push(line);
                i = 1;
            } else {
                // The \r was a standalone CR newline
                let line = String::from_utf8_lossy(&self.buffer).to_string();
                self.buffer.clear();
                lines.push(line);
            }
        }

        while i < chunk.len() {
            let b = chunk[i];
            if b == b'\r' {
                if i + 1 < chunk.len() {
                    if chunk[i + 1] == b'\n' {
                        // CRLF
                        let line = String::from_utf8_lossy(&self.buffer).to_string();
                        self.buffer.clear();
                        lines.push(line);
                        i += 2;
                        continue;
                    } else {
                        // Single CR
                        let line = String::from_utf8_lossy(&self.buffer).to_string();
                        self.buffer.clear();
                        lines.push(line);
                        i += 1;
                        continue;
                    }
                } else {
                    // CR at the very end of chunk: hold until next chunk
                    self.pending_cr = true;
                    break;
                }
            } else if b == b'\n' {
                let line = String::from_utf8_lossy(&self.buffer).to_string();
                self.buffer.clear();
                lines.push(line);
                i += 1;
            } else {
                self.buffer.push(b);
                i += 1;
            }
        }

        lines
    }

    pub fn flush(&mut self) -> Option<String> {
        if self.pending_cr {
            self.pending_cr = false;
            let line = String::from_utf8_lossy(&self.buffer).to_string();
            self.buffer.clear();
            return Some(line);
        }

        if !self.buffer.is_empty() {
            let line = String::from_utf8_lossy(&self.buffer).to_string();
            self.buffer.clear();
            Some(line)
        } else {
            None
        }
    }
}

impl Default for LineSplitter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_newlines() {
        let mut splitter = LineSplitter::new();
        let lines = splitter.feed(b"line1\nline2\r\nline3\rline4\n");
        assert_eq!(lines, vec!["line1", "line2", "line3", "line4"]);
        assert_eq!(splitter.flush(), None);
    }

    #[test]
    fn test_chunk_boundary_mid_line() {
        let mut splitter = LineSplitter::new();
        let l1 = splitter.feed(b"hel");
        assert!(l1.is_empty());
        let l2 = splitter.feed(b"lo\nw");
        assert_eq!(l2, vec!["hello"]);
        let l3 = splitter.feed(b"orld\n");
        assert_eq!(l3, vec!["world"]);
        assert_eq!(splitter.flush(), None);
    }

    #[test]
    fn test_chunk_boundary_between_cr_and_lf() {
        let mut splitter = LineSplitter::new();
        let l1 = splitter.feed(b"first\r");
        assert!(l1.is_empty());
        let l2 = splitter.feed(b"\nsecond\n");
        assert_eq!(l2, vec!["first", "second"]);
        assert_eq!(splitter.flush(), None);
    }

    #[test]
    fn test_chunk_boundary_cr_not_followed_by_lf() {
        let mut splitter = LineSplitter::new();
        let l1 = splitter.feed(b"first\r");
        assert!(l1.is_empty());
        let l2 = splitter.feed(b"second\n");
        assert_eq!(l2, vec!["first", "second"]);
        assert_eq!(splitter.flush(), None);
    }

    #[test]
    fn test_flush_trailing_data() {
        let mut splitter = LineSplitter::new();
        let l1 = splitter.feed(b"no_newline");
        assert!(l1.is_empty());
        assert_eq!(splitter.flush(), Some("no_newline".to_string()));
    }

    #[test]
    fn test_flush_trailing_cr() {
        let mut splitter = LineSplitter::new();
        let l1 = splitter.feed(b"trailing_cr\r");
        assert!(l1.is_empty());
        assert_eq!(splitter.flush(), Some("trailing_cr".to_string()));
    }
}
