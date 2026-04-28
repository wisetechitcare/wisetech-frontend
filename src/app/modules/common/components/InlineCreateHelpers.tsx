import {
  createProjectService,
  createProjectCategory,
  createProjectSubcategory
} from '@services/projects';
import { createCompanyService } from '@services/companies';
import { Option } from './MultiSelectWithInlineCreate';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';

// Helper functions for inline creation that return proper Option objects

/**
 * Create a new project service
 */
export const createNewService = async (name: string): Promise<Option> => {
  try {
    const payload = {
      name: name.trim(),
      isActive: true
    };
    
    const response = await createProjectService(payload);
    
    if (response?.service) {
      return {
        value: response.service.id,
        label: response.service.name,
        color: response.service.color || undefined
      };
    } else if (response?.id) {
      // Handle different response structure
      return {
        value: response.id,
        label: response.name || name,
        color: response.color || undefined
      };
    }
    
    throw new Error('Invalid response structure');
  } catch (error) {
    console.error('Error creating service:', error);
    throw new Error('Failed to create service. Please try again.');
  }
};

/**
 * Create a new project category
 */
export const createNewCategory = async (name: string): Promise<Option> => {
  try {
    const payload = {
      name: name.trim(),
      isActive: true
    };
    
    const response = await createProjectCategory(payload);
    
    if (response?.projectCategory) {
      return {
        value: response.projectCategory.id,
        label: response.projectCategory.name,
        color: response.projectCategory.color || undefined
      };
    } else if (response?.id) {
      // Handle different response structure
      return {
        value: response.id,
        label: response.name || name,
        color: response.color || undefined
      };
    }
    
    throw new Error('Invalid response structure');
  } catch (error) {
    console.error('Error creating category:', error);
    throw new Error('Failed to create category. Please try again.');
  }
};

/**
 * Create a new project subcategory
 * Note: This requires a categoryId which should be passed from the form context
 */
export const createNewSubcategory = async (
  name: string, 
  categoryId?: string
): Promise<Option> => {
  try {
    if (!categoryId) {
      throw new Error('A category must be selected before creating a subcategory');
    }
    
    const payload = {
      name: name.trim(),
      categoryId: categoryId,
      isActive: true
    };
    
    const response = await createProjectSubcategory(payload);
    
    if (response?.projectSubCategory) {
      return {
        value: response.projectSubCategory.id,
        label: response.projectSubCategory.name,
        color: response.projectSubCategory.color || undefined
      };
    } else if (response?.id) {
      // Handle different response structure
      return {
        value: response.id,
        label: response.name || name,
        color: response.color || undefined
      };
    }
    
    throw new Error('Invalid response structure');
  } catch (error) {
    console.error('Error creating subcategory:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to create subcategory. Please try again.'
    );
  }
};

/**
 * Generic error handler for inline creation
 */
export const handleInlineCreateError = (error: any, itemType: string) => {
  console.error(`Error creating ${itemType}:`, error);
  
  if (error?.response?.data?.message) {
    throw new Error(error.response.data.message);
  } else if (error?.message) {
    throw new Error(error.message);
  } else {
    throw new Error(`Failed to create ${itemType}. Please try again.`);
  }
};

/**
 * Transform API response to Option format
 */
export const transformToOption = (
  item: any, 
  idField = 'id', 
  nameField = 'name', 
  colorField = 'color'
): Option => {
  return {
    value: item[idField],
    label: item[nameField],
    color: item[colorField] || undefined
  };
};

/**
 * Transform array of API responses to Option array
 */
export const transformToOptions = (
  items: any[],
  idField = 'id',
  nameField = 'name',
  colorField = 'color'
): Option[] => {
  return items.map(item => transformToOption(item, idField, nameField, colorField));
};

/**
 * Create a new company service
 */
export const createNewCompanyService = async (name: string): Promise<Option> => {
  try {
    const payload = {
      name: name.trim(),
      isActive: true
    };

    console.log('Creating company service with payload:', payload);
    const response = await createCompanyService(payload);
    console.log('Company service creation response:', response);

    let newOption: Option;

    // Handle different possible response structures
    if (response?.data?.service) {
      newOption = {
        value: response.data.service.id,
        label: response.data.service.name,
        color: undefined // Company services don't have colors
      };
    } else if (response?.service) {
      newOption = {
        value: response.service.id,
        label: response.service.name,
        color: undefined
      };
    } else if (response?.data?.id) {
      newOption = {
        value: response.data.id,
        label: response.data.name || name,
        color: undefined
      };
    } else if (response?.id) {
      newOption = {
        value: response.id,
        label: response.name || name,
        color: undefined
      };
    } else {
      console.error('Unexpected response structure:', response);
      throw new Error('Invalid response structure');
    }

    // Emit event to notify other components that a service was created
    eventBus.emit(EVENT_KEYS.companyServiceCreated, { id: newOption.value });

    return newOption;
  } catch (error) {
    console.error('Error creating company service:', error);
    throw new Error('Failed to create company service. Please try again.');
  }
};