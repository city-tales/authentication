interface GPRCHandlers {
    convertGrpcDefaultToNull(value, fieldType);
}

class GPRCHandlersImpl implements GPRCHandlers {
    convertGrpcDefaultToNull(value, fieldType) {
        switch (fieldType) {
            case 'int32':
            case 'int64':
            case 'uint32':
            case 'uint64':
            case 'sint32':
            case 'sint64':
            case 'fixed32':
            case 'fixed64':
            case 'sfixed32':
            case 'sfixed64':
                // Default value is 0 for all numeric types
                return value === 0 ? null : value;
            
            case 'float':
            case 'double':
                // Default value is 0.0 for float/double types
                return value === 0.0 ? null : value;
            
            case 'string':
                // Default value is empty string for string types
                return value === '' ? null : value;
            
            case 'bool':
                // Default value is false for boolean types
                return value === false ? null : value;
            
            case 'bytes':
                // Default value is empty byte array for bytes types
                return value.length === 0 ? null : value;
            
            case 'enum':
                // Default value for enums is the first value (typically 0)
                return value === 0 ? null : value;
            
            case 'repeated':
                // Default value is an empty array for repeated fields
                return Array.isArray(value) && value.length === 0 ? null : value;
            
            case 'map':
                // Default value is an empty object for map fields
                return (typeof value === 'object' && Object.keys(value).length === 0) ? null : value;
    
            default:
                // Return value as is if field type is unknown or unsupported
                return value;
        }
    }
}


