

# fertility prediction node
def predict_fertility_node(state: WorkflowState) -> WorkflowState:
    """Predict soil fertility status"""
    logger.info("Starting fertility prediction...")
    
    try:
        # Validate preprocessor
        if not validate_preprocessor_state(fertility_preprocessor, "Fertility"):
            raise ValueError("Fertility preprocessor is not properly fitted")
        
        df = prepare_soil_dataframe(state["soil_data"])
        logger.debug(f"Original DataFrame for fertility prediction:\n{df.to_string()}")
        
        # Apply preprocessing
        logger.debug("Applying fertility preprocessing...")
        df_processed = fertility_preprocessor.transform(df)
        
        # Check feature alignment
        expected_features = FERTILITY_FEATURE_COLUMNS
        available_features = [col for col in expected_features if col in df_processed.columns]
        missing_features = [col for col in expected_features if col not in df_processed.columns]
        
        logger.info(f"Expected features: {expected_features}")
        logger.info(f"Available features: {available_features}")
        if missing_features:
            logger.warning(f"Missing features: {missing_features}")
        
        # Use available features for prediction
        if not available_features:
            raise ValueError("No expected features found in processed data")
        
        df_for_prediction = df_processed[available_features].copy()
        logger.debug(f"Final prediction DataFrame shape: {df_for_prediction.shape}")
        logger.debug(f"Final prediction DataFrame:\n{df_for_prediction.to_string()}")
        
        # Make prediction
        logger.debug("Making fertility prediction...")
        prediction = fertility_model.predict(df_for_prediction)
        probabilities = fertility_model.predict_proba(df_for_prediction)
        
        logger.debug(f"Raw fertility prediction: {prediction}")
        logger.debug(f"Fertility prediction probabilities: {probabilities}")
        
        fertility_status = FERTILITY_STATUS_MAP.get(prediction[0], "UNKNOWN")
        fertility_confidence = float(np.max(probabilities))
        
        state["fertility_prediction"] = fertility_status
        state["fertility_confidence"] = fertility_confidence
        
        logger.info(f"Fertility prediction completed: {fertility_status} (confidence: {fertility_confidence:.2f})")
        return state
        
    except Exception as e:
        logger.error(f"Error in fertility prediction: {e}")
        logger.error(f"Exception details:", exc_info=True)
        state["fertility_prediction"] = "UNKNOWN"
        state["fertility_confidence"] = 0.0
        return state