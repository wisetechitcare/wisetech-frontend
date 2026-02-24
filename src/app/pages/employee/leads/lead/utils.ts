import { leadAndProjectTemplateTypeId } from "@constants/statistics";
import dayjs from "dayjs";

export function mapLeadToFormInitialValues(
            lead: any) {
            const additional = lead?.additionalDetails || {};
            const additionalArray = Array.isArray(lead?.additionalDetails) ? lead.additionalDetails : [];
            // Determine template type
            const leadTemplateId = lead?.leadTemplateId;
            // Map referrals if present - improved mapping for edit mode
            const referrals = Array.isArray(lead?.referrals) && lead.referrals.length
                ? lead.referrals.map((r: any) => ({
                    id: r.id || Date.now().toString(),
                    referralType: r.referralType?.id || r.leadReferralTypeId || r?.referralTypeId || "",
                    referringCompany: r.referringCompany?.id || r.companyId || r?.referringCompanyId || '',
                    referringSubCompany: r.referringSubCompany?.id || r.subCompanyId || '',
                    referringContact: r.referredByContact?.id || r.contactId || r?.referredByContactId || '',
                    referredByEmployeeId: r.referredByEmployee?.id || r.referredByEmployeeId || '',
                    companyName: r.companyName || ''
                }))
                : [{ 
                    id: Date.now().toString(), 
                    referralType: '', 
                    referringCompany: '', 
                    referringSubCompany: '', 
                    referringContact: '',
                    referredByEmployeeId: '',
                    companyName: ''
                  }];

            // Map project areas from commercials array (new structure) or fallback to additionalDetails for MEP template
            const projectAreas = leadTemplateId === leadAndProjectTemplateTypeId.mep 
                ? (lead.commercials && Array.isArray(lead.commercials) && lead.commercials.length > 0
                    ? lead.commercials.map((commercial: any) => ({
                        id: commercial.id, // Include ID for edit mode
                        label: commercial.label || '',
                        projectArea: commercial.area || '',
                        costType: commercial.costType === "RATE" ? "1" : commercial.costType === "LUMPSUM" ? "2" : '',
                        rate: commercial.rate || '',
                        cost: commercial.cost || ''
                      }))
                    : additionalArray.length > 0 
                      ? additionalArray.map((item: any) => ({
                          label: '', // Default empty label for legacy data
                          projectArea: item.projectArea || '',
                          costType: '1', // Default to Rate type for legacy data
                          rate: '', // Legacy data might not have rate
                          cost: '' // Legacy data might not have cost
                        }))
                      : [{
                          label: '',
                          projectArea: '',
                          costType: '',
                          rate: '',
                          cost: ''
                        }])
                : [{
                    label: '',
                    projectArea: '',
                    costType: '',
                    rate: '',
                    cost: ''
                  }];

            // Map addresses from additionalDetails (now single object for one-to-one relationship)
            const addresses = leadTemplateId === leadAndProjectTemplateTypeId.mep 
                ? (lead.additionalDetails && !Array.isArray(lead.additionalDetails)
                    ? [{
                        projectAddress: lead.additionalDetails.projectAddress || '',
                        zipCode: lead.additionalDetails.zipCode || '',
                        mapLocation: lead.additionalDetails.mapLocation || '',
                        latitude: lead.additionalDetails.latitude || '',
                        longitude: lead.additionalDetails.longitude || '',
                        country: lead.additionalDetails.country || '',
                        state: lead.additionalDetails.state || '',
                        city: lead.additionalDetails.city || '',
                        locality: lead.additionalDetails.locality || '',
                        googleMapLink: lead.additionalDetails.googleMapLink || '',
                        googleMyBusinessLink: lead.additionalDetails.googleMyBusinessLink || '',
                        isDefault: false
                      }]
                    : additionalArray.length > 0 
                      ? additionalArray.map((item: any) => ({
                          projectAddress: item.projectAddress || '',
                          zipCode: item.zipCode || '',
                          mapLocation: item.mapLocation || '',
                          latitude: item.latitude || '',
                          longitude: item.longitude || '',
                          country: item.country || '',
                          state: item.state || '',
                          city: item.city || '',
                          locality: item.locality || '',
                          googleMapLink: item.googleMapLink || '',
                          googleMyBusinessLink: item.googleMyBusinessLink || '',
                          isDefault: false
                        }))
                      : [{
                          projectAddress: '',
                          zipCode: '',
                          mapLocation: '',
                          latitude: '',
                          longitude: '',
                          country: '',
                          state: '',
                          city: '',
                          locality: '',
                          googleMapLink: '',
                          googleMyBusinessLink: '',
                          isDefault: false
                        }])
                : [{
                    projectAddress: '',
                    zipCode: '',
                    mapLocation: '',
                    latitude: '',
                    longitude: '',
                    country: '',
                    state: '',
                    city: '',
                    locality: '',
                    googleMapLink: '',
                    googleMyBusinessLink: '',
                    isDefault: false
                  }];

            // Get PO number and date from first additionalDetails record
            const firstAdditional = additionalArray[0] || {};
    
            // Map leadTeams for multiple teams support - robust backward compatibility
            let leadTeams;
            
            if (lead.leadTeams && Array.isArray(lead.leadTeams) && lead.leadTeams.length > 0) {
                // If leadTeams exist in database, map them exactly as they are
                leadTeams = lead.leadTeams.map((team: any) => ({
                    id: team.id || Date.now().toString(),
                    companyTypeId: team.companyType?.id || team.companyTypeId || '',
                    companyId: team.company?.id || team.companyId || '',
                    subCompanyId: team.subCompany?.id || team.subCompanyId || '',
                    contactId: team.contact?.id || team.contactId || ''
                }));
            } else {
                // For backward compatibility: if no leadTeams exist, create one based on legacy fields
                leadTeams = [{ 
                    id: Date.now().toString(), 
                    companyTypeId: lead.company?.companyType?.id || lead.companyTypeId || '', 
                    companyId: lead.company?.id || lead.companyId || '', 
                    subCompanyId: lead.subCompany?.id || lead.subCompanyId || '', 
                    contactId: lead.contact?.id || lead.contactId || '' 
                }];
                
                // If all fields are empty, provide a clean empty row
                if (!leadTeams[0].companyTypeId && !leadTeams[0].companyId && !leadTeams[0].subCompanyId && !leadTeams[0].contactId) {
                    leadTeams = [{ 
                        id: Date.now().toString(), 
                        companyTypeId: '', 
                        companyId: '', 
                        subCompanyId: '', 
                        contactId: '' 
                    }];
                }
            }
            // Compose the result object
            const formValues: any = {
              id: lead.id,
              leadTemplateId: leadTemplateId,
              projectName: lead.title || "",
              service: lead.projectServiceId || "",
              category: lead.projectCategoryId || "",
              subCategory: lead.projectSubCategoryId || "",
              
              // // Multi-select arrays for new functionality
              // serviceIds: (() => {
              //   // Handle multiple services from lead.services array
              //   if (lead.services && Array.isArray(lead.services)) {
              //     return lead.services.map((s: any) => s.service?.id || s.serviceId).filter(Boolean);
              //   }
              //   // Fallback to single service for backward compatibility
              //   const singleServiceId = lead.projectService?.id || lead.projectServiceId || lead.service;
              //   return singleServiceId ? [singleServiceId] : [];
              // })(),
              
              // categoryIds: (() => {
              //   // Handle multi-select categories from junction table
              //   if (lead.leadCategories && Array.isArray(lead.leadCategories)) {
              //     return lead.leadCategories.map((lc: any) => lc.category?.id || lc.categoryId).filter(Boolean);
              //   }
              //   // Fallback to single category for backward compatibility
              //   const categoryId = lead.projectCategory?.id || lead.projectCategoryId || lead.category;
              //   return categoryId ? [categoryId] : [];
              // })(),
              
              // subcategoryIds: (() => {
              //   // Handle multi-select subcategories from junction table
              //   if (lead.leadSubCategories && Array.isArray(lead.leadSubCategories)) {
              //     return lead.leadSubCategories.map((lsc: any) => lsc.subcategory?.id || lsc.subcategoryId).filter(Boolean);
              //   }
              //   // Fallback to single subcategory for backward compatibility
              //   const subcategoryId = lead.projectSubCategory?.id || lead.projectSubCategoryId || lead.subCategory;
              //   return subcategoryId ? [subcategoryId] : [];
              // })(),
              startDate: lead.startDate || "",
              endDate: lead.endDate || "",
              rate: lead.rate || "",
              description: lead.description || "",
              subCompanyId: lead.subCompanyId || "",
              branchId: (lead.branchMappings && lead.branchMappings[0]?.branchId) || "",
              company: lead.company?.companyName || "",
              contactRoleId: lead.contactRoleId || lead.contact?.contactRoleId || "",
              leadInquiryDate: lead.inquiryDate || "",
              leadAssignedTo: lead.assignedToId || "",
              leadSource: lead.leadSource || "",
              leadSourceType: lead.leadSourceType || 'DIRECT',
              leadDirectSource: lead.leadDirectSource?.id || lead.leadDirectSourceId || '',
              statusId: lead.statusId || "",
              referrals: referrals,
              source: lead.source || "",
              cost: lead.budget || "",
              // Client teams (multiple teams support)
              leadTeams: leadTeams,
              
              // Legacy single team fields for backward compatibility
              // If leadTeams exist, use first team data for legacy compatibility
              ...(leadTeams.length > 0 && leadTeams[0].companyTypeId ? {
                companyTypeId: leadTeams[0].companyTypeId,
                companyId: leadTeams[0].companyId,
                contactPersonId: leadTeams[0].contactId,
              } : {
                companyTypeId: lead.company?.companyType?.id || lead.companyTypeId || '',
                companyId: lead.companyId || '',
                contactPersonId: lead?.contactId || '',
              }),
              // Additional fields for web-dev
              ...(leadTemplateId == leadAndProjectTemplateTypeId.webDev && {
                type: additional.type || firstAdditional.type || "",
                numberOfPages: additional.numberOfPages || firstAdditional.numberOfPages || "",
                latitude: additional.latitude || firstAdditional.latitude || "",
                longitude: additional.longitude || firstAdditional.longitude || "",
                mapLocation: additional.mapLocation || firstAdditional.mapLocation || "",
                country: additional.country || firstAdditional.country || "",
                state: additional.state || firstAdditional.state || "",
                city: additional.city || firstAdditional.city || "",
                locality: additional.locality || firstAdditional.locality || "",
                zipCode: additional.zipCode || firstAdditional.zipCode || "",
                poNumber: additional.poNumber || firstAdditional.poNumber || "",
                poDate: additional.poDate || firstAdditional.poDate || "",
              }),
              // Additional fields for mep
              ...(leadTemplateId == leadAndProjectTemplateTypeId.mep && {
                projectAreas: projectAreas,
                addresses: addresses,
                poNumber: firstAdditional.poNumber || "",
                poDate: firstAdditional.poDate ? dayjs(firstAdditional.poDate).format("YYYY-MM-DD") : "",
                // Legacy fields for backward compatibility
                projectArea: additional.projectArea || firstAdditional.projectArea || "",
                projectAddress: additional.projectAddress || firstAdditional.projectAddress || "",
              })
            };
            return formValues;
        }