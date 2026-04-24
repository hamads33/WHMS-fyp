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
 *    value={formData}
 *    onChange={handleChange}
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

export function SchemaForm({
  schema = {},
  value = {},
  onChange,
  readOnly = false,
  title,
  description,
}) {
  const [formData, setFormData] = useState(value);
  const [errors, setErrors] = useState({});
  const [expandedSections, setExpandedSections] = useState({});

  // Sync formData with value prop
  React.useEffect(() => {
    setFormData(value);
  }, [value]);

  // Toggle section expansion
  const toggleSection = useCallback((section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // Handle input change
  const handleChange = useCallback((path, newValue) => {
    setFormData((prev) => {
      const updated = { ...prev };
      const keys = path.split(".");
      let current = updated;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        current[key] = current[key] || {};
        current = current[key];
      }

      current[keys[keys.length - 1]] = newValue;
      return updated;
    });

    // Call onChange prop if provided
    if (onChange) {
      setFormData((prev) => {
        onChange(prev);
        return prev;
      });
    }

    // Clear error for this field
    if (errors[path]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[path];
        return newErrors;
      });
    }
  }, [errors, onChange]);

  // Validate field
  const validateField = useCallback((path, fieldValue, fieldSchema) => {
    const errors_ = [];

    if (fieldSchema.required && !fieldValue) {
      errors_.push(`${fieldSchema.label || path} is required`);
    }

    if (fieldSchema.minLength && fieldValue?.length < fieldSchema.minLength) {
      errors_.push(
        `${fieldSchema.label || path} must be at least ${fieldSchema.minLength} characters`
      );
    }

    if (fieldSchema.maxLength && fieldValue?.length > fieldSchema.maxLength) {
      errors_.push(
        `${fieldSchema.label || path} cannot exceed ${fieldSchema.maxLength} characters`
      );
    }

    if (fieldSchema.pattern && !new RegExp(fieldSchema.pattern).test(fieldValue)) {
      errors_.push(`${fieldSchema.label || path} format is invalid`);
    }

    if (fieldSchema.type === "number") {
      if (fieldSchema.minimum && fieldValue < fieldSchema.minimum) {
        errors_.push(`${fieldSchema.label || path} must be at least ${fieldSchema.minimum}`);
      }
      if (fieldSchema.maximum && fieldValue > fieldSchema.maximum) {
        errors_.push(`${fieldSchema.label || path} cannot exceed ${fieldSchema.maximum}`);
      }
    }

    return errors_;
  }, []);

  // Render field based on type
  const renderField = (path, fieldSchema, fieldValue) => {
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
              value={fieldValue || ""}
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
            value={fieldValue || ""}
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
            value={fieldValue || ""}
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
          <Select value={fieldValue || ""} onValueChange={(val) => handleChange(path, val)}>
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
            checked={fieldValue || false}
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
                const nestedValue = fieldValue?.[key];
                return renderField(nestedPath, nestedSchema, nestedValue);
              })}
            </div>
          )}
        </div>
      );
    }

    // Array (simple)
    if (fieldSchema.type === "array") {
      const arrayValue = fieldValue || [];

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
    <>
      {/* Fields only - no Card wrapper */}
      <div className="space-y-4">
        {Object.entries(properties).map(([key, fieldSchema]) => {
          const fieldValue = formData[key];
          return renderField(key, fieldSchema, fieldValue);
        })}
      </div>
    </>
  );
}