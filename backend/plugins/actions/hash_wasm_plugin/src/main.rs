// src/main.rs
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::{read_to_string, write};
use std::path::PathBuf;
use rand::{RngCore, rngs::OsRng};
use hex::encode as hex_encode;

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
struct Input {
    // operation: "sha256" | "math" | "rand"
    op: String,
    // for sha256: data (string)
    data: Option<String>,
    // for math: expression type & numbers, simple operations:
    // { "op": "math", "math": { "type":"add"|"sub"|"mul"|"div", "a": number, "b": number } }
    math: Option<MathOp>,
    // for rand: size in bytes or range
    rand: Option<RandomSpec>,
}

#[derive(Deserialize)]
struct MathOp {
    #[serde(rename = "type")]
    kind: String,
    a: f64,
    b: f64,
}

#[derive(Deserialize)]
struct RandomSpec {
    // either "bytes" or "int_range"
    kind: String,
    // for bytes
    size: Option<usize>,
    // for int range [min, max]
    min: Option<i64>,
    max: Option<i64>,
}

#[derive(Serialize)]
struct Output {
    ok: bool,
    op: String,
    result: serde_json::Value,
    message: Option<String>,
}

fn input_path(plugin_dir: &str) -> String {
    // WASI preopen mapping in executor: pluginDir -> /plugin
    format!("{}/input.json", plugin_dir)
}

fn output_path(plugin_dir: &str) -> String {
    format!("{}/output.json", plugin_dir)
}

// simple safe divide
fn safe_div(a: f64, b: f64) -> Option<f64> {
    if b == 0.0 { None } else { Some(a / b) }
}

#[no_mangle]
pub extern "C" fn run() -> i32 {
    // Attempt to use the environment variable PLUGIN_DIR if present,
    // otherwise fall back to "/plugin"
    let plugin_dir = std::env::var("PLUGIN_DIR").unwrap_or_else(|_| "/plugin".to_string());
    let in_path = input_path(&plugin_dir);
    let out_path = output_path(&plugin_dir);

    // Read input.json
    let input_json = match read_to_string(&in_path) {
        Ok(s) => s,
        Err(e) => {
            let out = Output {
                ok: false,
                op: "read_input".to_string(),
                result: serde_json::json!(null),
                message: Some(format!("Failed to read input.json at {}: {}", in_path, e)),
            };
            let _ = write(&out_path, serde_json::to_string(&out).unwrap_or_default());
            return 1;
        }
    };

    let input: Input = match serde_json::from_str(&input_json) {
        Ok(i) => i,
        Err(e) => {
            let out = Output {
                ok: false,
                op: "parse_input".to_string(),
                result: serde_json::json!(null),
                message: Some(format!("Invalid input JSON: {}", e)),
            };
            let _ = write(&out_path, serde_json::to_string(&out).unwrap_or_default());
            return 2;
        }
    };

    let op = input.op.clone().to_lowercase();
    let mut out = Output {
        ok: true,
        op: op.clone(),
        result: serde_json::json!(null),
        message: None,
    };

    match op.as_str() {
        "sha256" => {
            if let Some(data) = input.data {
                let mut hasher = Sha256::new();
                hasher.update(data.as_bytes());
                let result = hasher.finalize();
                out.result = serde_json::json!({ "hex": hex_encode(result) });
            } else {
                out.ok = false;
                out.message = Some("Missing 'data' for sha256 op".to_string());
            }
        }
        "math" => {
            if let Some(m) = input.math {
                let res = match m.kind.as_str() {
                    "add" => serde_json::json!(m.a + m.b),
                    "sub" => serde_json::json!(m.a - m.b),
                    "mul" => serde_json::json!(m.a * m.b),
                    "div" => {
                        match safe_div(m.a, m.b) {
                            Some(v) => serde_json::json!(v),
                            None => {
                                out.ok = false;
                                out.message = Some("Division by zero".to_string());
                                serde_json::json!(null)
                            }
                        }
                    }
                    _ => {
                        out.ok = false;
                        out.message = Some(format!("Unknown math type: {}", m.kind));
                        serde_json::json!(null)
                    }
                };
                out.result = res;
            } else {
                out.ok = false;
                out.message = Some("Missing 'math' object for math op".to_string());
            }
        }
        "rand" => {
            if let Some(r) = input.rand {
                match r.kind.as_str() {
                    "bytes" => {
                        let size = r.size.unwrap_or(16);
                        let mut buf = vec![0u8; size];
                        // use OS RNG (WASI provides /dev/urandom)
                        if let Err(e) = OsRng.try_fill_bytes(&mut buf) {
                            out.ok = false;
                            out.message = Some(format!("Random generation failed: {}", e));
                        } else {
                            out.result = serde_json::json!({ "hex": hex_encode(buf) });
                        }
                    }
                    "int_range" => {
                        let min = r.min.unwrap_or(0);
                        let max = r.max.unwrap_or(100);
                        if max < min {
                            out.ok = false;
                            out.message = Some("rand int_range: max < min".to_string());
                        } else {
                            let mut rng = OsRng;
                            let range = (max - min + 1) as u64;
                            let v = (rng.next_u64() % range) as i64 + min;
                            out.result = serde_json::json!({ "value": v });
                        }
                    }
                    other => {
                        out.ok = false;
                        out.message = Some(format!("Unknown rand kind: {}", other));
                    }
                }
            } else {
                out.ok = false;
                out.message = Some("Missing 'rand' for rand op".to_string());
            }
        }
        other => {
            out.ok = false;
            out.message = Some(format!("Unknown op: {}", other));
        }
    }

    // Write output.json
    let _ = write(&out_path, serde_json::to_string(&out).unwrap_or_default());

    // Return numeric code: 0 success, non-zero error
    if out.ok { 0 } else { 10 }
}
