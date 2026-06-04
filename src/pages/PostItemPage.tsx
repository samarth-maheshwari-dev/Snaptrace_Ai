import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Image as ImageIcon, Sparkles, Wand2, Calendar, CheckSquare, Trash2, ArrowLeft, ArrowRight, ShieldAlert } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fileToBase64, analyzeItemImage, generateItemImage, isDemoMode } from '../lib/gemini';
import { uploadItemImage } from '../lib/supabase';

export default function PostItemPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [demoMode, setDemoMode] = useState(isDemoMode);

  // Form Fields States
  const [type, setType] = useState<'lost' | 'found' | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [dateOccurred, setDateOccurred] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Image states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGeneratingAIImage, setIsGeneratingAIImage] = useState(false);

  // Loading pipeline state
  const [submitting, setSubmitting] = useState(false);
  const [submittingIndex, setSubmittingIndex] = useState(0);

  // Query server status on mount
  useState(() => {
    fetch('/api/gemini/status')
      .then((res) => res.json())
      .then((data) => setDemoMode(!data.hasAPIKey))
      .catch(() => setDemoMode(true));
  });

  const submissionMessages = [
    '📤 Uploading your image...',
    '🤖 Analyzing with Gemini Vision...',
    '💾 Saving to database...',
    '✅ Running match check...',
  ];

  // Geolocation handling
  const [geoLoading, setGeoLoading] = useState(false);
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(`AITR Campus Near Locale [Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}]`);
        setGeoLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocation('AITR Indore Canteen Area (Current Location)');
        setGeoLoading(false);
      }
    );
  };

  // Drag and Drop Zone Config
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles[0]) {
      const file = acceptedFiles[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  } as any);

  // Generative Nano Banana Image call
  const handleGenerateAIImage = async () => {
    if (!title || !category) {
      alert('Please fill out the Title and Category field first so the model understands what to generate.');
      return;
    }

    setIsGeneratingAIImage(true);
    try {
      const prompt = `A highly realistic, clear visual of: ${title}. Category is ${category}. ${
        description ? `Characteristics: ${description}` : ''
      }`;
      const imageUrl = await generateItemImage(prompt);
      
      // Set the resulting generated URL as preview
      setImagePreview(imageUrl);
      setImageFile(null); // Mark file null since we use string base64/preset directly
    } catch (e) {
      console.error(e);
      alert('Could not execute Nano Banana image generation fallback. Try uploading an image manually.');
    } finally {
      setIsGeneratingAIImage(false);
    }
  };

  const handleNextStep = () => {
    if (step === 2) {
      if (!title || !category || !location || !contactName || !contactEmail) {
        alert('Please fill all required inputs marked with an asterisk (*).');
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const handlePrevStep = () => {
    setStep((s) => s - 1);
  };

  // Pipeline Submission loop
  const handleSubmitItem = async () => {
    setSubmitting(true);
    setSubmittingIndex(0);

    try {
      let finalImageUrl = imagePreview || '';
      let descriptorJson: any = null;

      // Stage 1: Uploading image representation
      if (imageFile) {
        setSubmittingIndex(0);
        finalImageUrl = await uploadItemImage(imageFile);
      } else if (imagePreview && imagePreview.startsWith('data:image')) {
        // Base64 AI generated visual. Convert to simulated multipart local files URL or store base64 direct
        setSubmittingIndex(0);
        const uniqueId = crypto.randomUUID();
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: `${uniqueId}.png`,
            base64: imagePreview.split(',')[1],
          }),
        });
        if (res.ok) {
          const uData = await res.json();
          finalImageUrl = uData.url;
        }
      }

      // Stage 2: Gemini Vision AI analysis
      setSubmittingIndex(1);
      let base64Data = '';
      if (imageFile) {
        base64Data = await fileToBase64(imageFile);
      } else if (imagePreview && imagePreview.startsWith('data:image')) {
        base64Data = imagePreview.split(',')[1];
      }

      if (base64Data) {
        descriptorJson = await analyzeItemImage(base64Data, imageFile?.type || 'image/png');
      } else {
        // fallback descriptor
        descriptorJson = {
          category: category.toLowerCase(),
          primaryColor: 'multicolor',
          secondaryColors: [],
          brand: null,
          distinctiveFeatures: ['custom reported'],
          material: 'other',
          size: 'medium',
          condition: 'good',
          itemDescription: `A newly posted ${title}`,
        };
      }

      // Stage 3: Storing item in DB
      setSubmittingIndex(2);
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          category,
          location,
          date_occurred: dateOccurred,
          description: description || undefined,
          contact_email: contactEmail,
          contact_name: contactName,
          image_url: finalImageUrl || undefined,
          descriptor_json: descriptorJson,
        }),
      });

      if (!res.ok) {
        throw new Error('Database insert failed.');
      }

      const createdItem = await res.json();

      // Stage 4: Cross comparison match calculations
      setSubmittingIndex(3);
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Fetch opposite items list to search matches
      const oppType = type === 'lost' ? 'found' : 'lost';
      const browseRes = await fetch(`/api/items?type=${oppType}&status=open`);
      let hasMatch = false;

      if (browseRes.ok) {
        const oppItems = await browseRes.json();
        const { computeSimilarity } = await import('../utils/similarity');

        for (const item of oppItems) {
          const score = computeSimilarity(descriptorJson, item.descriptor_json);
          if (score >= 70) {
            hasMatch = true;
            break;
          }
        }
      }

      setSubmitting(false);

      if (hasMatch) {
        alert(`🎉 Potential Match Found!\n\nA student reported a highly similar item on the campus database. We are forwarding you to the item directory list.`);
      } else {
        alert('✅ Item cataloged successfully! You will be immediately notified once an AI-match is detected on campus.');
      }

      navigate(`/item/${createdItem.id}`);
    } catch (e: any) {
      console.error(e);
      alert('Posting failed: ' + (e.message || 'Error occurred.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0D0D0D] text-[#F5F5F5] min-h-screen flex flex-col font-inter justify-between">
      <Navbar />

      <main className="flex-grow pt-28 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full pb-16">
        
        {/* Demo Mode Banner */}
        {demoMode && (
          <div className="bg-[#FFB800]/10 border border-[#FFB800]/20 text-[#FFB800] text-xs py-3 px-4 rounded-xl text-center mb-6 flex items-center justify-center gap-2 font-medium font-inter animate-fade-up">
            <ShieldAlert className="w-4 h-4 shrink-0 animate-bounce" />
            <span>⚡ Demo Mode — Gemini API key not configured. AI functions will use pre-cached static descriptors and high-fidelity simulated graphics.</span>
          </div>
        )}

        {/* Multi-step progress bar */}
        <section className="mb-10 text-center select-none">
          <div className="flex items-center justify-center gap-4 max-w-md mx-auto relative">
            
            {/* Step 1 indicator */}
            <div className="flex flex-col items-center z-10">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold font-syne text-sm transition-all duration-300 ${
                  step >= 1
                    ? 'bg-[#FF2D55] text-white ring-4 ring-[#FF2D55]/20'
                    : 'bg-[#161616] border border-[#2A2A2A] text-gray-500'
                }`}
              >
                1
              </div>
              <span className={`text-[10px] font-mono mt-1 ${step >= 1 ? 'text-white' : 'text-gray-500'}`}>
                Type
              </span>
            </div>

            {/* Line 1 */}
            <div className={`flex-grow h-[2px] transition-all duration-500 ${step >= 2 ? 'bg-[#FF2D55]' : 'bg-[#2A2A2A]'}`} />

            {/* Step 2 indicator */}
            <div className="flex flex-col items-center z-10">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold font-syne text-sm transition-all duration-300 ${
                  step >= 2
                    ? 'bg-[#FF2D55] text-white ring-4 ring-[#FF2D55]/20'
                    : 'bg-[#161616] border border-[#2A2A2A] text-gray-500'
                }`}
              >
                2
              </div>
              <span className={`text-[10px] font-mono mt-1 ${step >= 2 ? 'text-white' : 'text-gray-500'}`}>
                Details
              </span>
            </div>

            {/* Line 2 */}
            <div className={`flex-grow h-[2px] transition-all duration-500 ${step >= 3 ? 'bg-[#FF2D55]' : 'bg-[#2A2A2A]'}`} />

            {/* Step 3 indicator */}
            <div className="flex flex-col items-center z-10">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold font-syne text-sm transition-all duration-300 ${
                  step >= 3
                    ? 'bg-[#FF2D55] text-white ring-4 ring-[#FF2D55]/20'
                    : 'bg-[#161616] border border-[#2A2A2A] text-gray-500'
                }`}
              >
                3
              </div>
              <span className={`text-[10px] font-mono mt-1 ${step >= 3 ? 'text-white' : 'text-gray-500'}`}>
                Photo
              </span>
            </div>

          </div>
        </section>

        {/* STEP CONTENT SECTION */}
        <section className="bg-[#161616] border border-[#2A2A2A] rounded-2xl p-6 sm:p-10 shadow-xl min-h-[400px] flex flex-col justify-between">
          
          <AnimatePresence mode="wait">
            {/* STEP 1: Choose Type */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8 flex-grow"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-2xl font-black font-syne text-white">Record Your Report Classification</h3>
                  <p className="text-gray-400 font-inter text-xs">Choose the category of the item you want to list on campus.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  {/* Lost choice */}
                  <button
                    onClick={() => setType('lost')}
                    className={`p-8 text-center rounded-2xl border transition-all duration-300 focus:outline-none flex flex-col justify-center items-center gap-4 cursor-pointer ${
                      type === 'lost'
                        ? 'border-[#FF2D55] bg-[#FF2D55]/5 shadow-[0_0_30px_rgba(255,45,85,0.15)] scale-[1.02]'
                        : 'border-[#2A2A2A] hover:border-[#FF2D55]/50 bg-[#1A1A1A]/30'
                    }`}
                  >
                    <span className="text-5xl select-none filter drop-shadow">🔴</span>
                    <div className="space-y-1">
                      <h4 className="font-syne font-extrabold text-white text-lg">I LOST something</h4>
                      <p className="text-gray-500 text-xs font-inter max-w-[200px]">List an item that was misplaced on campus.</p>
                    </div>
                  </button>

                  {/* Found choice */}
                  <button
                    onClick={() => setType('found')}
                    className={`p-8 text-center rounded-2xl border transition-all duration-300 focus:outline-none flex flex-col justify-center items-center gap-4 cursor-pointer ${
                      type === 'found'
                        ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.15)] scale-[1.02]'
                        : 'border-[#2A2A2A] hover:border-blue-500/50 bg-[#1A1A1A]/30'
                    }`}
                  >
                    <span className="text-5xl select-none filter drop-shadow">🔵</span>
                    <div className="space-y-1">
                      <h4 className="font-syne font-extrabold text-white text-lg">I FOUND something</h4>
                      <p className="text-gray-500 text-xs font-inter max-w-[200px]">Report an object you recovered on campus grounds.</p>
                    </div>
                  </button>
                </div>

                <div className="flex justify-end pt-8">
                  <button
                    disabled={!type}
                    onClick={handleNextStep}
                    className="button-primary flex items-center gap-2 disabled:opacity-40"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Fill Details */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5 flex-grow"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-2xl font-black font-syne text-white">Item Characteristic Profile</h3>
                  <p className="text-gray-400 font-inter text-xs">Input key identifier markers to facilitate search algorithms.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  {/* Item Title */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-inter text-[#888888] font-medium">
                      Item Title / Name <span className="text-[#FF2D55]">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      className="input-style"
                      placeholder="e.g. Red Puma Backpack, Black Dell Laptop Bag..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  {/* Category Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-inter text-[#888888] font-medium">
                      Category Tag <span className="text-[#FF2D55]">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="input-style text-xs h-[45px] cursor-pointer"
                    >
                      <option value="">Select Category</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Stationery">Stationery</option>
                      <option value="Accessories">Accessories</option>
                      <option value="ID/Cards">ID/Cards</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Date Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-inter text-[#888888] font-medium">
                      Date Misplaced or Spotted <span className="text-[#FF2D55]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        required
                        type="date"
                        className="input-style pl-10 pr-4 text-xs h-[45px]"
                        value={dateOccurred}
                        onChange={(e) => setDateOccurred(e.target.value)}
                      />
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    </div>
                  </div>

                  {/* Geolocation Locator */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-inter text-[#888888] font-medium">
                        Location Description <span className="text-[#FF2D55]">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleUseMyLocation}
                        className="text-[#FF2D55] hover:text-[#E0263A] text-xs font-bold font-inter flex items-center gap-1 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {geoLoading ? 'Acquiring...' : 'Use my location'}
                      </button>
                    </div>
                    <input
                      required
                      type="text"
                      className="input-style"
                      placeholder="e.g. Computer Science Lab A, Library Floor 2 desk 4..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>

                  {/* Description Box text limit 300 */}
                  <div className="space-y-1.5 sm:col-span-2 relative">
                    <label className="text-xs font-inter text-[#888888] font-medium">
                      Item Description <span className="text-gray-500">(Optional)</span>
                    </label>
                    <textarea
                      maxLength={300}
                      rows={3}
                      className="input-style text-xs pb-6 resize-none h-24"
                      placeholder="e.g. Color wear near bottom zipper, key chain depicting astronaut dangling, sticker on casing, etc."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <div className="absolute right-3.5 bottom-2.5 text-[10px] text-gray-500 font-mono">
                      {description.length} / 300
                    </div>
                  </div>

                  {/* Contact detail headers */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-inter text-[#888888] font-medium">
                      Your Full Name <span className="text-[#FF2D55]">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      className="input-style"
                      placeholder="e.g. Aryan Patel"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-inter text-[#888888] font-medium">
                      Contact Email Address <span className="text-[#FF2D55]">*</span>
                    </label>
                    <input
                      required
                      type="email"
                      className="input-style"
                      placeholder="e.g. student@aitr.ac.in"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>

                </div>

                {/* Back and Next */}
                <div className="flex justify-between pt-8">
                  <button
                    onClick={handlePrevStep}
                    className="button-ghost flex items-center gap-1 text-[#888888]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>

                  <button
                    onClick={handleNextStep}
                    className="button-primary flex items-center gap-1.5"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Upload Photo */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 flex-grow flex flex-col justify-between"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-2xl font-black font-syne text-white">Visual Identification</h3>
                  <p className="text-gray-400 font-inter text-xs">Verify the item pictorially using files or generative AI synthesis.</p>
                </div>

                {!imagePreview ? (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center flex-grow">
                    
                    {/* Drag & Drop zone */}
                    <div
                      {...getRootProps()}
                      className={`md:col-span-3 border-2 border-dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer h-56 select-none ${
                        isDragActive
                          ? 'border-[#FF2D55] bg-[#FF2D55]/5 scale-102'
                          : 'border-[#2A2A2A] hover:border-[#FF2D55] bg-[#1A1A1A]/20'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <ImageIcon className="w-10 h-10 text-[#FF2D55]" />
                      <div className="space-y-0.5">
                        <span className="block text-sm font-semibold font-syne text-white">
                          Drop your item photo here
                        </span>
                        <span className="block text-[11px] text-gray-400 font-inter">
                          or click to select folders
                        </span>
                      </div>
                      <span className="text-[9px] text-gray-500 font-mono block">
                        JPEG, PNG, WEBP · Max 5MB
                      </span>
                    </div>

                    <div className="text-gray-600 font-syne font-bold font-mono text-center select-none uppercase text-sm block">
                      OR
                    </div>

                    {/* AI Illustration Generator Option "nano bannana" */}
                    <div className="md:col-span-1 flex flex-col items-center justify-center p-6 border border-[#2A2A2A] bg-[#1A1A1A]/30 rounded-2xl text-center space-y-3 h-56">
                      <Sparkles className="w-8 h-8 text-[#FFB800] animate-pulse" />
                      <div className="space-y-0.5 select-none">
                        <span className="block text-xs font-bold text-white font-syne">Generate Visual</span>
                        <span className="block text-[10px] text-gray-500 font-inter leading-relaxed">
                          No real photograph? Build one using AI of what it looks like.
                        </span>
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleGenerateAIImage}
                        disabled={isGeneratingAIImage}
                        className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#FFB800] rounded-xl text-[10px] font-bold text-white font-mono px-3.5 py-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                      >
                        {isGeneratingAIImage ? (
                          <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Wand2 className="w-3 h-3 text-[#FFB800]" />
                            Nano Banana AI
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 bg-[#0F0F0F] rounded-2xl border border-[#2A2A2A] p-6 max-w-sm mx-auto flex-grow relative">
                    <img
                      src={imagePreview}
                      alt="Item Visual representation"
                      className="max-h-64 rounded-xl object-contain w-full filter drop-shadow-md"
                    />
                    
                    {/* Trash file */}
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-4 right-4 bg-black/60 hover:bg-[#FF2D55]/20 text-[#FF2D55] border border-[#FF2D55]/30 hover:border-[#FF2D55] p-2 rounded-xl transition-all h-9 w-9 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-mono text-gray-500 bg-[#161616] px-3 py-1 border border-[#2A2A2A] rounded-full">
                      🤖 Gemini AI will analyze this photo to help with matching
                    </span>
                  </div>
                )}

                {/* Confirm upload footer */}
                <div className="flex justify-between pt-8 border-t border-[#2A2A2A]">
                  <button
                    onClick={handlePrevStep}
                    className="button-ghost flex items-center gap-1 text-[#888888]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>

                  <button
                    onClick={handleSubmitItem}
                    className="button-primary flex items-center gap-1.5"
                  >
                    Submit Item Report
                    <CheckSquare className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </section>

      </main>

      {/* PIPELINE PROCESSING LAYER OVERLAY */}
      {submitting && (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[100] animate-fade-up">
          <div className="max-w-md w-full px-8 text-center space-y-8 animate-pulse">
            
            <span className="text-7xl block animate-bounce">🤖</span>
            
            <div className="space-y-2">
              <h3 className="font-syne font-black text-white text-2xl">Deploying Analyzer Pipeline</h3>
              <p className="text-xs font-inter text-[#888888] uppercase tracking-widest leading-relaxed">
                {submissionMessages[submittingIndex]}
              </p>
            </div>

            {/* Custom linear loop progress bar */}
            <div className="relative w-full h-[3px] bg-[#161616] rounded-full overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#FF2D55] to-[#FF6B35] animate-pulse w-full" style={{ animationDuration: '0.8s' }} />
            </div>

            <span className="text-[10px] font-mono text-gray-500 block">
              Estimated pipeline completion: 3 seconds. Please do not close browser.
            </span>

          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
