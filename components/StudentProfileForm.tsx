import React from 'react';
import type { UserProfile, Stage } from '../types';

interface StudentProfileFormProps {
    profile: UserProfile;
    onProfileChange: (profile: UserProfile) => void;
}

// FIX: Made `children` optional to resolve type errors where the component is used conditionally.
const FormSection = ({ title, children }: { title: string, children?: React.ReactNode }) => (
    <div className="mb-8">
        <h3 className="text-lg font-semibold text-white/90 border-b border-white/15 pb-2 mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {children}
        </div>
    </div>
);

// FIX: Made `children` optional to resolve type errors where the component is used conditionally.
const FormField = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <label className="block">
        <div className="text-sm text-white/70 mb-1">{label}</div>
        {children}
    </label>
);

const TextInput = (props: React.ComponentProps<'input'>) => (
    <input {...props} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-white" />
);

const SelectInput = (props: React.ComponentProps<'select'>) => (
    <select {...props} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none text-white focus:ring-2 focus:ring-white" />
);


export function StudentProfileForm({ profile, onProfileChange }: StudentProfileFormProps) {
    
    const handleNestedChange = <T extends keyof UserProfile>(section: T, field: keyof UserProfile[T], value: any) => {
        onProfileChange({
            ...profile,
            [section]: {
                ...profile[section],
                [field]: value
            }
        });
    };

    const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
         handleNestedChange('general', 'stage', e.target.value as Stage);
    }
    
    return (
        <form onSubmit={e => e.preventDefault()} className="text-sm">
            <FormSection title="General Information">
                <FormField label="Name and Surname">
                    <TextInput value={profile.general.name} onChange={e => handleNestedChange('general', 'name', e.target.value)} />
                </FormField>
                <FormField label="Email address">
                    <TextInput type="email" value={profile.general.email} onChange={e => handleNestedChange('general', 'email', e.target.value)} />
                </FormField>
                <FormField label="Country">
                    <TextInput value={profile.general.country} onChange={e => handleNestedChange('general', 'country', e.target.value)} />
                </FormField>
                 <FormField label="Timezone">
                    <TextInput value={profile.general.timezone} readOnly />
                </FormField>
                <FormField label="What do you use Neura for?">
                    <SelectInput value={profile.general.usage} onChange={e => handleNestedChange('general', 'usage', e.target.value)}>
                        <option>Part-time (Tutor/Learning support)</option>
                        <option>Full-time (Home-schooling)</option>
                        <option>Other</option>
                    </SelectInput>
                </FormField>
                {profile.general.usage === 'Other' && (
                    <FormField label="Please specify">
                         <TextInput value={profile.general.usageOther} onChange={e => handleNestedChange('general', 'usageOther', e.target.value)} />
                    </FormField>
                )}
                <FormField label="Stage">
                    <SelectInput value={profile.general.stage} onChange={handleStageChange}>
                        <option value="">Select a stage...</option>
                        <option>Primary</option>
                        <option>High School</option>
                        <option>University</option>
                        <option>Professional Studies</option>
                    </SelectInput>
                </FormField>
            </FormSection>

            {profile.general.stage === 'Primary' && (
                 <FormSection title="Primary Student Details">
                     <FormField label="Name of School (optional)">
                        <TextInput value={profile.primary.schoolName} onChange={e => handleNestedChange('primary', 'schoolName', e.target.value)} />
                    </FormField>
                    <FormField label="Grade (1-7)">
                        <TextInput value={profile.primary.grade} onChange={e => handleNestedChange('primary', 'grade', e.target.value)} />
                    </FormField>
                     <FormField label="Syllabus/Curriculum">
                        <TextInput value={profile.primary.syllabus} onChange={e => handleNestedChange('primary', 'syllabus', e.target.value)} placeholder="e.g., Cambridge Primary, CAPS, IB" />
                    </FormField>
                 </FormSection>
            )}

            {profile.general.stage === 'High School' && (
                 <FormSection title="High School Details">
                    <FormField label="Name of School (optional)">
                        <TextInput value={profile.highSchool.schoolName} onChange={e => handleNestedChange('highSchool', 'schoolName', e.target.value)} />
                    </FormField>
                    <FormField label="Grade or Year">
                        <TextInput value={profile.highSchool.grade} onChange={e => handleNestedChange('highSchool', 'grade', e.target.value)} placeholder="e.g. IGCSE Year 10, A2"/>
                    </FormField>
                     <FormField label="Syllabus Framework">
                        <TextInput value={profile.highSchool.syllabus} onChange={e => handleNestedChange('highSchool', 'syllabus', e.target.value)} placeholder="e.g., Cambridge, CAPS, IB" />
                    </FormField>
                    <FormField label="Target Exam Series">
                        <SelectInput value={profile.highSchool.examSeries} onChange={e => handleNestedChange('highSchool', 'examSeries', e.target.value)}>
                            <option value="">Select series...</option>
                            <option>May/June</option>
                            <option>Oct/Nov</option>
                            <option>Jan</option>
                        </SelectInput>
                    </FormField>
                    <FormField label="Target Exam Year">
                        <TextInput type="number" value={profile.highSchool.examYear} onChange={e => handleNestedChange('highSchool', 'examYear', e.target.value)} placeholder="e.g. 2025" />
                    </FormField>
                 </FormSection>
            )}
            
            {profile.general.stage === 'University' && (
                 <FormSection title="University Details">
                    <FormField label="Name of Institution">
                        <TextInput value={profile.university.institution} onChange={e => handleNestedChange('university', 'institution', e.target.value)} />
                    </FormField>
                    <FormField label="Course or Programme Name">
                        <TextInput value={profile.university.courseName} onChange={e => handleNestedChange('university', 'courseName', e.target.value)} />
                    </FormField>
                    <FormField label="Year of Study (1-6)">
                        <TextInput type="number" value={profile.university.yearOfStudy} onChange={e => handleNestedChange('university', 'yearOfStudy', e.target.value)} />
                    </FormField>
                    <FormField label="Assessment Type">
                        <SelectInput value={profile.university.assessmentType} onChange={e => handleNestedChange('university', 'assessmentType', e.target.value)}>
                            <option value="">Select type...</option>
                            <option>Exam</option>
                            <option>Coursework</option>
                            <option>Practical</option>
                            <option>Mixed</option>
                        </SelectInput>
                    </FormField>
                 </FormSection>
            )}

            {profile.general.stage === 'Professional Studies' && (
                 <FormSection title="Professional Studies Details">
                    <FormField label="Field of Study or Work">
                        <TextInput value={profile.professional.field} onChange={e => handleNestedChange('professional', 'field', e.target.value)} placeholder="e.g. Accounting, Nursing" />
                    </FormField>
                    <FormField label="Qualification or Exam Name">
                        <TextInput value={profile.professional.qualification} onChange={e => handleNestedChange('professional', 'qualification', e.target.value)} placeholder="e.g. ACCA, NCLEX, AWS" />
                    </FormField>
                    <FormField label="Exam Date or Window">
                        <TextInput type="date" value={profile.professional.examDate} onChange={e => handleNestedChange('professional', 'examDate', e.target.value)} />
                    </FormField>
                 </FormSection>
            )}

            <FormSection title="Learning Preferences">
                {/* Simplified for now */}
                <FormField label="Available Study Hours per Week">
                    <TextInput type="number" value={profile.learningPreferences.studyHours} onChange={e => handleNestedChange('learningPreferences', 'studyHours', e.target.value)} />
                </FormField>
                <FormField label="Motivation Type">
                     <SelectInput value={profile.learningPreferences.motivation} onChange={e => handleNestedChange('learningPreferences', 'motivation', e.target.value)}>
                        <option value="">Select motivation...</option>
                        <option>Grades</option>
                        <option>University Entry</option>
                        <option>Mastery</option>
                        <option>Work</option>
                        <option>Other</option>
                    </SelectInput>
                </FormField>
                {profile.learningPreferences.motivation === 'Other' && (
                    <FormField label="Please specify motivation">
                         <TextInput value={profile.learningPreferences.motivationOther} onChange={e => handleNestedChange('learningPreferences', 'motivationOther', e.target.value)} />
                    </FormField>
                )}
            </FormSection>

            <FormSection title="SEN / Medical (Optional)">
                <div className="md:col-span-2">
                    <label className="flex items-center gap-2">
                         <input type="checkbox" checked={profile.sen.hasSEN} onChange={e => handleNestedChange('sen', 'hasSEN', e.target.checked)} className="h-4 w-4 rounded bg-white/10 border-white/20 text-blue-500 focus:ring-blue-500/50 accent-blue-500" />
                        <span>I have a learning difference or medical condition</span>
                    </label>
                </div>
                {profile.sen.hasSEN && (
                    <>
                         <FormField label="Type of Condition">
                             <SelectInput value={profile.sen.condition} onChange={e => handleNestedChange('sen', 'condition', e.target.value)}>
                                <option value="">Select condition...</option>
                                <option>ADHD</option>
                                <option>Dyslexia</option>
                                <option>Dyscalculia</option>
                                <option>ASD</option>
                                <option>Hearing/Vision</option>
                                <option>Other</option>
                            </SelectInput>
                        </FormField>
                         {profile.sen.condition === 'Other' && (
                            <FormField label="Please specify condition">
                                 <TextInput value={profile.sen.conditionOther} onChange={e => handleNestedChange('sen', 'conditionOther', e.target.value)} />
                            </FormField>
                        )}
                        <FormField label="Accommodations">
                            <TextInput value={profile.sen.accommodations} onChange={e => handleNestedChange('sen', 'accommodations', e.target.value)} placeholder="e.g., Extra time, Reader"/>
                        </FormField>
                    </>
                )}
            </FormSection>

             <FormSection title="Guardian Info (for minors)">
                 <FormField label="Guardian Name">
                    <TextInput value={profile.guardian.name} onChange={e => handleNestedChange('guardian', 'name', e.target.value)} />
                </FormField>
                <FormField label="Guardian Email">
                    <TextInput type="email" value={profile.guardian.email} onChange={e => handleNestedChange('guardian', 'email', e.target.value)} />
                </FormField>
                 <FormField label="Guardian Phone">
                    <TextInput type="tel" value={profile.guardian.phone} onChange={e => handleNestedChange('guardian', 'phone', e.target.value)} />
                </FormField>
                <FormField label="Relationship to Student">
                    <TextInput value={profile.guardian.relationship} onChange={e => handleNestedChange('guardian', 'relationship', e.target.value)} />
                </FormField>
            </FormSection>

            {/* Upload section is a placeholder for now */}
            <FormSection title="Upload Study Resources (Optional)">
                <div className="md:col-span-2 p-8 border-2 border-dashed border-white/20 rounded-lg text-center text-white/50">
                    Drag &amp; Drop Coming Soon
                </div>
            </FormSection>
        </form>
    )
}
