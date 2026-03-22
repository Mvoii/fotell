"use client";

import React, { useState } from 'react';
import { useCreateMarket } from '@/hooks/useAdmin';
import type { CreateMarketRequest } from '@/lib/api/types/admin';
import { MARKET_CREATION_LIMITS } from '@/lib/api/types/admin';
import { validateMarketCreation, formatLiquidityParam, parseLiquidityParam } from '@/lib/validation';
import { Button } from '@/components/ui/button';

interface CreateMarketWizardProps {
  onSuccess?: (marketId: string) => void;
  onCancel?: () => void;
}

export function CreateMarketWizard({ onSuccess, onCancel }: CreateMarketWizardProps) {
  const createMarketMutation = useCreateMarket();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CreateMarketRequest>({
    question: '',
    description: '',
    closes_at: '',
    liquidity_param: MARKET_CREATION_LIMITS.LIQUIDITY_PARAM_MIN,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateMarketRequest, string>>>({});

  const validateStep = (step: number): boolean => {
    if (step === 3) {
      // Final validation of all data
      const errors = validateMarketCreation(formData);
      const errorMap: Partial<Record<keyof CreateMarketRequest, string>> = {};
      
      errors.forEach(error => {
        errorMap[error.field] = error.message;
      });
      
      setErrors(errorMap);
      return errors.length === 0;
    }

    const newErrors: Partial<Record<keyof CreateMarketRequest, string>> = {};

    if (step === 1) {
      // Validate question
      if (!formData.question.trim()) {
        newErrors.question = 'Question is required';
      } else if (formData.question.length < MARKET_CREATION_LIMITS.QUESTION_MIN_LENGTH) {
        newErrors.question = `Question must be at least ${MARKET_CREATION_LIMITS.QUESTION_MIN_LENGTH} characters`;
      } else if (formData.question.length > MARKET_CREATION_LIMITS.QUESTION_MAX_LENGTH) {
        newErrors.question = `Question must be no more than ${MARKET_CREATION_LIMITS.QUESTION_MAX_LENGTH} characters`;
      }

      // Validate description (optional)
      if (formData.description && formData.description.length > MARKET_CREATION_LIMITS.DESCRIPTION_MAX_LENGTH) {
        newErrors.description = `Description must be no more than ${MARKET_CREATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters`;
      }
    }

    if (step === 2) {
      // Validate closing date
      if (!formData.closes_at) {
        newErrors.closes_at = 'Closing date is required';
      } else {
        const closingDate = new Date(formData.closes_at);
        const now = new Date();
        if (closingDate <= now) {
          newErrors.closes_at = 'Closing date must be in the future';
        }
      }

      // Validate liquidity parameter
      if (formData.liquidity_param < MARKET_CREATION_LIMITS.LIQUIDITY_PARAM_MIN) {
        newErrors.liquidity_param = `Liquidity parameter must be at least ${MARKET_CREATION_LIMITS.LIQUIDITY_PARAM_MIN}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (validateStep(currentStep)) {
      try {
        const result = await createMarketMutation.mutateAsync(formData);
        onSuccess?.(result.id);
      } catch (error) {
        // Error is already handled by the mutation
        console.error('Market creation failed:', error);
      }
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="heading-lg text-primary mb-4">Market Question</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Question *
                  </label>
                  <textarea
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    className="w-full px-3 py-2 border border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue min-h-25"
                    placeholder="e.g., Will Bitcoin reach $100,000 by end of March 2026?"
                    maxLength={MARKET_CREATION_LIMITS.QUESTION_MAX_LENGTH}
                  />
                  {errors.question && (
                    <p className="text-error text-sm mt-1">{errors.question}</p>
                  )}
                  <p className="text-xs text-primary mt-1">
                    {formData.question.length}/{MARKET_CREATION_LIMITS.QUESTION_MAX_LENGTH} characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue min-h-20"
                    placeholder="Provide additional context or resolution criteria..."
                    maxLength={MARKET_CREATION_LIMITS.DESCRIPTION_MAX_LENGTH}
                  />
                  {errors.description && (
                    <p className="text-error text-sm mt-1">{errors.description}</p>
                  )}
                  <p className="text-xs text-primary mt-1">
                    {(formData.description || '').length}/{MARKET_CREATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="heading-lg text-primary mb-4">Market Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Closing Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.closes_at}
                    onChange={(e) => setFormData({ ...formData, closes_at: e.target.value })}
                    className="w-full px-3 py-2 border border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {errors.closes_at && (
                    <p className="text-error text-sm mt-1">{errors.closes_at}</p>
                  )}
                  <p className="text-xs text-primary mt-1">
                    When trading will end and market will close for resolution
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Liquidity Parameter *
                  </label>
                  <input
                    type="text"
                    value={formatLiquidityParam(formData.liquidity_param)}
                    onChange={(e) => setFormData({ ...formData, liquidity_param: parseLiquidityParam(e.target.value) })}
                    className="w-full px-3 py-2 border border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    min={MARKET_CREATION_LIMITS.LIQUIDITY_PARAM_MIN}
                  />
                  {errors.liquidity_param && (
                    <p className="text-error text-sm mt-1">{errors.liquidity_param}</p>
                  )}
                  <p className="text-xs text-primary mt-1">
                    Controls price volatility. Higher values create more stable prices.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="heading-lg text-primary mb-4">Review & Create</h3>
              <div className="bg-surface border border-subtle rounded-lg p-6 space-y-4">
                <div>
                  <h4 className="font-medium text-primary mb-2">Question</h4>
                  <p className="text-primary">{formData.question}</p>
                </div>

                {formData.description && (
                  <div>
                    <h4 className="font-medium text-primary mb-2">Description</h4>
                    <p className="text-primary">{formData.description}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-primary mb-2">Closing Date</h4>
                  <p className="text-primary">
                    {new Date(formData.closes_at).toLocaleString()}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-primary mb-2">Liquidity Parameter</h4>
                  <p className="text-primary">{formatLiquidityParam(formData.liquidity_param)}</p>
                </div>

                <div className="pt-4 border-t border-subtle">
                  <p className="text-sm text-primary">
                    <strong>Important:</strong> Once created, this market will be in PENDING status.
                    You will need to manually open it for trading when ready.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                step <= currentStep
                  ? 'border-accent-blue bg-accent-blue text-white'
                  : 'border-subtle text-primary'
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  step < currentStep ? 'bg-accent-blue' : 'bg-subtle'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-primary">Question</span>
          <span className="text-xs text-primary">Settings</span>
          <span className="text-xs text-primary">Review</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <div>
          {currentStep > 1 && (
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={createMarketMutation.isPending}
            >
              Previous
            </Button>
          )}
        </div>

        <div className="flex space-x-3">
          {onCancel && (
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={createMarketMutation.isPending}
            >
              Cancel
            </Button>
          )}

          {currentStep < 3 ? (
            <Button
              variant="default"
              onClick={handleNext}
              disabled={createMarketMutation.isPending}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={handleSubmit}
              disabled={createMarketMutation.isPending}
            >
              Create Market
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {createMarketMutation.error && (
        <div className="mt-4 p-4 bg-error/10 border border-error/20 rounded-md">
          <p className="text-error text-sm">
            Failed to create market: {createMarketMutation.error.message}
          </p>
        </div>
      )}
    </div>
  );
}
