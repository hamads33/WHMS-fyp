/**
 * Schema Form Component
 * ============================================================
 * Auto-generates forms from JSON Schema
 * 
 * Features:
 *  - Dynamic form generation
 *  - Multiple input types (text, select, number, object, array)
 *  - Validation support
 *  - Custom error display
 *  - Nested object support
 * 
 * Usage:
 *  <SchemaForm 
 *    schema={jsonSchema}
 *    onSubmit={handleSubmit}
 *    defaultValues={existingData}
 *  />
 */

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ChevronDown, ChevronUp, Plus, X } from "lucide-react";

const SchemaForm = ({
  schema = {},
  onSubmit,
  onCancel,
  defaultValues = {},
  readOnly = false,
  title,
  description,
}) => {
  const [formData, setFormData] = useState(defaultValues);
  const [errors, setErrors] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle section expansion
  const toggleSection = useCallback((section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // Handle input change
  const handleChange = useCallback((path, value) => {
    setFormData((prev) => {
      const newData = { ...prev };
      const keys = path.split(".");
      let current = newData;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        current[key] = current[key] || {};
        current = current[key];
      }

      current[keys[keys.length - 1]] = value;
      return newData;
    });

    // Clear error for this field
    if (errors[path]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[path];
        return newErrors;
      });
    }
  }, [errors]);

  // Validate field
  const validateField = useCallback((path, value, fieldSchema) => {
    const errors_ = [];

    if (fieldSchema.required && !value) {
      errors_.push(`${fieldSchema.label || path} is required`);
    }

    if (fieldSchema.minLength && value?.length < fieldSchema.minLength) {
      errors_.push(
        `${fieldSchema.label || path} must be at least ${fieldSchema.minLength} characters`
      );
    }

    if (fieldSchema.maxLength && value?.length > fieldSchema.maxLength) {
      errors_.push(
        `${fieldSchema.label || path} cannot exceed ${fieldSchema.maxLength} characters`
      );
    }

    if (fieldSchema.pattern && !new RegExp(fieldSchema.pattern).test(value)) {
      errors_.push(`${fieldSchema.label || path} format is invalid`);
    }

    if (fieldSchema.type === "number") {
      if (fieldSchema.minimum && value < fieldSchema.minimum) {
        errors_.push(`${fieldSchema.label || path} must be at least ${fieldSchema.minimum}`);
      }
      if (fieldSchema.maximum && value > fieldSchema.maximum) {
        errors_.push(`${fieldSchema.label || path} cannot exceed ${fieldSchema.maximum}`);
      }
    }

    return errors_;
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newErrors = {};
      const properties = schema.properties || {};

      // Validate all required fields
      Object.entries(properties).forEach(([key, fieldSchema]) => {
        const value = formData[key];
        const fieldErrors = validateField(key, value, fieldSchema);
        if (fieldErrors.length > 0) {
          newErrors[key] = fieldErrors;
        }
      });

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // Submit form
      if (onSubmit) {
        await onSubmit(formData);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render field based on type
  const renderField = (path, fieldSchema, value) => {
    const fieldId = `field-${path}`;
    const hasError = errors[path];
    const label = fieldSchema.label || fieldSchema.title || path;

    // Text input
    if (fieldSchema.type === "string" && !fieldSchema.enum) {
      if (fieldSchema.format === "textarea") {
        return (
          <div key={fieldId} className="space-y-2">
            <Label htmlFor={fieldId} className="capitalize">
              {label}
              {fieldSchema.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={fieldId}
              placeholder={fieldSchema.description || ""}
              value={value || ""}
              onChange={(e) => handleChange(path, e.target.value)}
              disabled={readOnly}
              rows={fieldSchema.rows || 3}
              className={hasError ? "border-red-500" : ""}
            />
            {fieldSchema.description && (
              <p className="text-sm text-gray-500">{fieldSchema.description}</p>
            )}
            {hasError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{hasError[0]}</AlertDescription>
              </Alert>
            )}
          </div>
        );
      }

      return (
        <div key={fieldId} className="space-y-2">
          <Label htmlFor={fieldId} className="capitalize">
            {label}
            {fieldSchema.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            id={fieldId}
            type={fieldSchema.format || "text"}
            placeholder={fieldSchema.placeholder || ""}
            value={value || ""}
            onChange={(e) => handleChange(path, e.target.value)}
            disabled={readOnly}
            className={hasError ? "border-red-500" : ""}
          />
          {fieldSchema.description && (
            <p className="text-sm text-gray-500">{fieldSchema.description}</p>
          )}
          {hasError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{hasError[0]}</AlertDescription>
            </Alert>
          )}
        </div>
      );
    }

    // Number input
    if (fieldSchema.type === "number" || fieldSchema.type === "integer") {
      return (
        <div key={fieldId} className="space-y-2">
          <Label htmlFor={fieldId} className="capitalize">
            {label}
            {fieldSchema.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            id={fieldId}
            type="number"
            min={fieldSchema.minimum}
            max={fieldSchema.maximum}
            step={fieldSchema.type === "integer" ? "1" : "0.01"}
            value={value || ""}
            onChange={(e) => handleChange(path, Number(e.target.value))}
            disabled={readOnly}
            className={hasError ? "border-red-500" : ""}
          />
          {hasError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{hasError[0]}</AlertDescription>
            </Alert>
          )}
        </div>
      );
    }

    // Select input (enum)
    if (fieldSchema.enum) {
      return (
        <div key={fieldId} className="space-y-2">
          <Label htmlFor={fieldId} className="capitalize">
            {label}
            {fieldSchema.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Select value={value || ""} onValueChange={(val) => handleChange(path, val)}>
            <SelectTrigger disabled={readOnly} className={hasError ? "border-red-500" : ""}>
              <SelectValue placeholder={`Select ${label}`} />
            </SelectTrigger>
            <SelectContent>
              {fieldSchema.enum.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{hasError[0]}</AlertDescription>
            </Alert>
          )}
        </div>
      );
    }

    // Boolean input
    if (fieldSchema.type === "boolean") {
      return (
        <div key={fieldId} className="flex items-center space-x-2">
          <input
            id={fieldId}
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleChange(path, e.target.checked)}
            disabled={readOnly}
            className="rounded"
          />
          <Label htmlFor={fieldId} className="capitalize cursor-pointer">
            {label}
          </Label>
        </div>
      );
    }

    // Object (nested)
    if (fieldSchema.type === "object" && fieldSchema.properties) {
      const isExpanded = expandedSections[path] ?? true;

      return (
        <div key={fieldId} className="border rounded-lg p-4 space-y-3">
          <button
            type="button"
            onClick={() => toggleSection(path)}
            className="flex items-center justify-between w-full font-semibold hover:text-blue-600"
          >
            <span className="capitalize">{label}</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {isExpanded && (
            <div className="space-y-4 pl-4">
              {Object.entries(fieldSchema.properties).map(([key, nestedSchema]) => {
                const nestedPath = `${path}.${key}`;
                const nestedValue = value?.[key];
                return renderField(nestedPath, nestedSchema, nestedValue);
              })}
            </div>
          )}
        </div>
      );
    }

    // Array (simple)
    if (fieldSchema.type === "array") {
      const arrayValue = value || [];

      return (
        <div key={fieldId} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="capitalize">{label}</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleChange(path, [...arrayValue, ""])}
              disabled={readOnly}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {arrayValue.map((item, index) => (
              <div key={`${fieldId}-${index}`} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => {
                    const newArray = [...arrayValue];
                    newArray[index] = e.target.value;
                    handleChange(path, newArray);
                  }}
                  disabled={readOnly}
                  placeholder={`Item ${index + 1}`}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    const newArray = arrayValue.filter((_, i) => i !== index);
                    handleChange(path, newArray);
                  }}
                  disabled={readOnly}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  const properties = schema.properties || {};

  return (
    <Card className="p-6 w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        {(title || description) && (
          <div className="space-y-2">
            {title && <h2 className="text-2xl font-bold">{title}</h2>}
            {description && <p className="text-gray-600">{description}</p>}
          </div>
        )}

        {/* Fields */}
        <div className="space-y-4">
          {Object.entries(properties).map(([key, fieldSchema]) => {
            const value = formData[key];
            return renderField(key, fieldSchema, value);
          })}
        </div>

        {/* Actions */}
        {!readOnly && (
          <div className="flex gap-3 justify-end pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
};

export default SchemaForm;