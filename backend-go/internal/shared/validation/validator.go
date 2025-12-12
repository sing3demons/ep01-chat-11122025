package validation

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
)

// Validator defines the interface for validation operations
type Validator interface {
	Struct(s interface{}) error
	Var(field interface{}, tag string) error
}

type validatorImpl struct {
	validate *validator.Validate
}

// New creates a new validator instance
func New() Validator {
	validate := validator.New()

	// Register custom tag name function to use json tags
	validate.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	return &validatorImpl{
		validate: validate,
	}
}

func (v *validatorImpl) Struct(s interface{}) error {
	err := v.validate.Struct(s)
	if err == nil {
		return nil
	}

	// Convert validation errors to a more user-friendly format
	var validationErrors []string
	for _, err := range err.(validator.ValidationErrors) {
		validationErrors = append(validationErrors, v.formatValidationError(err))
	}

	return fmt.Errorf("validation failed: %s", strings.Join(validationErrors, ", "))
}

func (v *validatorImpl) Var(field interface{}, tag string) error {
	err := v.validate.Var(field, tag)
	if err == nil {
		return nil
	}

	// Convert validation error to a more user-friendly format
	if validationErr, ok := err.(validator.ValidationErrors); ok {
		var validationErrors []string
		for _, err := range validationErr {
			validationErrors = append(validationErrors, v.formatValidationError(err))
		}
		return fmt.Errorf("validation failed: %s", strings.Join(validationErrors, ", "))
	}

	return fmt.Errorf("validation failed: %w", err)
}

func (v *validatorImpl) formatValidationError(err validator.FieldError) string {
	field := err.Field()
	tag := err.Tag()
	param := err.Param()

	switch tag {
	case "required":
		return fmt.Sprintf("%s is required", field)
	case "email":
		return fmt.Sprintf("%s must be a valid email address", field)
	case "min":
		return fmt.Sprintf("%s must be at least %s characters long", field, param)
	case "max":
		return fmt.Sprintf("%s must be at most %s characters long", field, param)
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", field, param)
	case "uuid":
		return fmt.Sprintf("%s must be a valid UUID", field)
	case "url":
		return fmt.Sprintf("%s must be a valid URL", field)
	case "numeric":
		return fmt.Sprintf("%s must be numeric", field)
	case "alpha":
		return fmt.Sprintf("%s must contain only letters", field)
	case "alphanum":
		return fmt.Sprintf("%s must contain only letters and numbers", field)
	default:
		return fmt.Sprintf("%s failed validation for tag '%s'", field, tag)
	}
}