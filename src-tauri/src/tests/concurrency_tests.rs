//! Concurrency and thread safety tests
//!
//! Tests for error handling in concurrent scenarios with the simplified error system.

#[cfg(test)]
mod tests {
    use crate::error::KopiaError;
    use std::sync::Arc;
    use std::thread;

    #[test]
    fn test_error_send_sync() {
        // Test that KopiaError implements Send and Sync
        fn assert_send<T: Send>() {}
        fn assert_sync<T: Sync>() {}

        assert_send::<KopiaError>();
        assert_sync::<KopiaError>();
    }

    #[test]
    fn test_error_sharing_across_threads() {
        // Test that errors can be shared across threads
        let error = Arc::new(KopiaError::ServerNotRunning);

        let handles: Vec<_> = (0..5)
            .map(|_| {
                let error_clone = Arc::clone(&error);
                thread::spawn(move || {
                    // Use the error in another thread
                    let _ = error_clone.to_string();
                })
            })
            .collect();

        for handle in handles {
            handle.join().unwrap();
        }
    }

    #[test]
    fn test_concurrent_error_creation() {
        // Test creating errors concurrently from multiple threads
        let handles: Vec<_> = (0..10)
            .map(|i| {
                thread::spawn(move || KopiaError::ServerAlreadyRunning {
                    port: 8000 + i as u16,
                })
            })
            .collect();

        let errors: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();

        assert_eq!(errors.len(), 10);
    }

    #[test]
    fn test_error_serialization_concurrent() {
        // Test error serialization from multiple threads
        let error = Arc::new(KopiaError::OperationFailed {
            operation: "test".to_string(),
            message: "concurrent test".to_string(),
            details: None,
            status_code: None,
            api_error_code: None,
        });

        let handles: Vec<_> = (0..5)
            .map(|_| {
                let error_clone = Arc::clone(&error);
                thread::spawn(move || serde_json::to_string(&*error_clone).unwrap())
            })
            .collect();

        let jsons: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();

        // All serializations should be identical
        for json in &jsons {
            assert_eq!(json, &jsons[0]);
        }
    }

    #[test]
    fn test_result_type_across_threads() {
        // Test that Result<T, KopiaError> can be used across threads
        use crate::error::Result;

        let handles: Vec<_> = (0..5)
            .map(|i| {
                thread::spawn(move || -> Result<i32> {
                    if i % 2 == 0 {
                        Ok(i)
                    } else {
                        Err(KopiaError::operation_failed("test", "odd number"))
                    }
                })
            })
            .collect();

        let results: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();

        assert_eq!(results.len(), 5);
        assert!(results[0].is_ok());
        assert!(results[1].is_err());
    }
}
