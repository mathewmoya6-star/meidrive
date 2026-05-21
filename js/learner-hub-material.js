import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://jeksrwrzzrczamxijvwl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impla3Nyd3J6enJjemFteGlqdndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NzYyMjAsImV4cCI6MjA5NDI1MjIyMH0.1poYpJKNFEVe2NTBkXBTH2bIHGk2yT8aqCU-OlJc4vs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// ALL 8 COURSES
// ============================================
const courses = [
    {
        id: 1,
        title: '🚗 Learner Hub',
        description: 'Complete NTSA-approved driver training for new drivers. Covers all 21 units from introduction to advanced driving techniques.',
        content: 'The Learner Hub is a comprehensive driver training program covering all aspects of driving including traffic rules, vehicle control, emergency procedures, and exam preparation.',
        type: 'premium',
        price: 5000,
        duration: '40 hours',
        level: 'Beginner to Advanced',
        category: 'learner',
        icon: '🚗'
    },
    {
        id: 2,
        title: '🚌 PSV (Public Service Vehicle)',
        description: 'Specialized training for matatu, bus, and taxi drivers focusing on passenger safety, commercial regulations, and customer service.',
        content: 'PSV training covers passenger safety, route management, fare handling, customer service, and NTSA PSV regulations.',
        type: 'premium',
        price: 7500,
        duration: '25 hours',
        level: 'Intermediate',
        category: 'psv',
        icon: '🚌'
    },
    {
        id: 3,
        title: '🚸 School Bus/Van Driver',
        description: 'Specialized safety training for school transport drivers focusing on child safety, route management, and emergency protocols.',
        content: 'School transport safety training covering child passenger safety, loading/unloading procedures, emergency evacuation, and student management.',
        type: 'premium',
        price: 6500,
        duration: '20 hours',
        level: 'Intermediate',
        category: 'school-bus',
        icon: '🚸'
    },
    {
        id: 4,
        title: '⚡ EV Vehicle Course',
        description: 'Master electric vehicle driving, charging management, and EV-specific safety protocols for modern sustainable transport.',
        content: 'EV course covers electric vehicle controls, battery management, charging stations, regenerative braking, and EV safety protocols.',
        type: 'premium',
        price: 8000,
        duration: '15 hours',
        level: 'Beginner to Intermediate',
        category: 'ev',
        icon: '⚡'
    },
    {
        id: 5,
        title: '🛵 Boda Boda (Motorcycle)',
        description: 'Professional motorcycle taxi training covering safety, passenger transport, and defensive riding techniques.',
        content: 'Boda boda training covers motorcycle controls, protective gear, passenger safety, defensive riding, and route optimization.',
        type: 'premium',
        price: 5500,
        duration: '20 hours',
        level: 'Beginner',
        category: 'boda-boda',
        icon: '🛵'
    },
    {
        id: 6,
        title: '🚛 Professional Driver/Refresher',
        description: 'Advanced training for experienced drivers. Refresher course covering defensive driving and advanced techniques.',
        content: 'Professional driver refresher course covering advanced defensive driving, skid control, adverse conditions, and fleet management.',
        type: 'premium',
        price: 7000,
        duration: '15 hours',
        level: 'Advanced',
        category: 'professional',
        icon: '🚛'
    },
    {
        id: 7,
        title: '📚 e-Safety Library',
        description: 'Free comprehensive road safety resources, guides, and educational materials for all road users.',
        content: 'Free safety resources including pedestrian guides, cyclist safety, child education, first aid, and traffic act reference.',
        type: 'free',
        price: 0,
        duration: 'Self-paced',
        level: 'All levels',
        category: 'safety',
        icon: '📚'
    },
    {
        id: 8,
        title: '📝 Quiz Bank (1000+ Questions)',
        description: 'Comprehensive exam preparation with 1000+ NTSA-style practice questions covering all driving categories.',
        content: 'Quiz bank with over 1000 NTSA-style questions covering road signs, traffic rules, vehicle controls, and emergency procedures.',
        type: 'premium',
        price: 3000,
        duration: 'Self-paced',
        level: 'All levels',
        category: 'quiz',
        icon: '📝'
    }
];

// ============================================
// LEARNER HUB UNITS (21 UNITS)
// ============================================
const learnerHubUnits = [
    {
        course_id: 1,
        unit_number: 1,
        title: 'Introduction to Driving',
        content: `UNIT 1: INTRODUCTION TO DRIVING

Motor vehicles are an important part of our day-to-day living and provide a means for people and goods to be transported from one location to another.

The goal of driver training is ensure that you, as the driver, are equipped with the right knowledge of how to handle your vehicle and how to act appropriately when using the road.

Most traffic accidents are caused by human error, however this can be easily prevented when the driver is adequately prepared for the traffic situation.`,
        duration: '2 hours',
        key_points: ['Motor vehicles transport people and goods', 'Driver training provides knowledge and skills', 'Most accidents caused by human error']
    },
    {
        course_id: 1,
        unit_number: 2,
        title: 'Fundamental Driving Rules',
        content: `UNIT 2: FUNDAMENTAL DRIVING RULES

The road is governed by rules and regulations that ensure order is maintained on the roads at all times.

The Traffic Act sets out the laws that govern the use of roads. The Highway Code is a set of information, advice, guides and mandatory rules for all road users.

KEY RULES:
• Use horn only while moving to warn others
• Give right-of-way to police, fire engines, ambulances
• Respect pedestrian right of way
• Follow all traffic signs and signals`,
        duration: '3 hours',
        key_points: ['Traffic Act and Highway Code govern road use', 'Horn only for warning while moving', 'Give way to emergency vehicles']
    },
    {
        course_id: 1,
        unit_number: 3,
        title: 'Model Town',
        content: `UNIT 3: MODEL TOWN

The model town board features:
- One way traffic road (Dual Carriage Way) with white lines
- Two way traffic road (Single Carriageway) with yellow center line
- Roundabout with 4 lanes and clockwise movement
- Parking zones (Angle and Flush parking)
- Yellow kerb indicating no parking/stopping
- Pedestrian crossing
- Stop and Give way signs

ROUNDABOUT RULES:
• No stopping, no changing lanes, no parking, no overtaking
• Keep left and move clockwise
• Count lanes from outermost to innermost`,
        duration: '4 hours',
        key_points: ['One-way roads: white lines, yellow kerb = no stopping', 'Roundabout: keep left, no overtaking', 'Angle parking: forward in, reverse out']
    },
    {
        course_id: 1,
        unit_number: 4,
        title: 'Human Factors in Traffic',
        content: `UNIT 4: HUMAN FACTORS IN TRAFFIC

OBSERVATION RULES:
• Keep your eyes moving
• Get a wide view of what's ahead and behind
• Use all mirrors
• Ensure other road users can see you

FATIGUE PREVENTION:
• Get quality sleep before driving
• Take regular breaks on long distances
• If tired, stop at a safe place

ALCOHOL EFFECTS:
• Slows brain functions
• Reduces judgment of speed/distance
• Gives false confidence
• Affects balance

SAFETY EQUIPMENT:
• Reflector Triangle - place 50m ahead and behind
• First Aid Kit
• Fire Extinguisher
• Spare tyre
• Tool box`,
        duration: '3 hours',
        key_points: ['Keep eyes moving, use all mirrors', 'No cell phones while driving', 'Alcohol slows brain function', 'Carry safety equipment']
    },
    {
        course_id: 1,
        unit_number: 5,
        title: 'Vehicle Constructions and Controls',
        content: `UNIT 5: VEHICLE CONSTRUCTIONS AND CONTROLS

CONTROLS AND FUNCTIONS:
• Steering Wheel - Change direction
• Direction Indicator - Signal turns
• Gear Lever - Change gears
• Hand Brake - Keep stationary on inclines
• Brake Pedal - Slow or stop
• Accelerator - Increase speed
• Clutch Pedal - Change gears (manual)
• Rear-view Mirror - See behind
• Side Mirror - See sides
• Speedometer - Show speed
• Temperature Gauge - Check engine temperature

VEHICLE SYSTEMS:
• Engine, Braking system, Steering system
• Transmission system, Suspension system
• Electrical system`,
        duration: '5 hours',
        key_points: ['Steering wheel controls direction', 'Brake slows, accelerator speeds up', 'Mirrors for visibility', 'Check dashboard gauges']
    },
    {
        course_id: 1,
        unit_number: 6,
        title: 'Self-Inspection of Vehicle',
        content: `UNIT 6: SELF-INSPECTION OF VEHICLE

EXTERIOR INSPECTION:
• Tyres - pressure, tread depth, condition
• Reflectors and lights - headlights, signals, hazards
• Mirrors - present, adjusted, unobstructed
• Windshield Wipers - work at all settings
• Windows - open and shut properly
• Safety Belts - functional clasps
• Emergency equipment - triangle, extinguisher, first aid

INTERIOR INSPECTION:
• Brakes - properly adjusted
• Steering - full range of motion
• Indicators - operational
• Transmission - shift into any gear
• Oil level - check and top up
• Coolant - check level
• Battery - check connections
• Leaks - check for any fluid leaks`,
        duration: '2 hours',
        key_points: ['Check tyres, lights, mirrors before journey', 'Verify emergency equipment', 'Check brakes and steering']
    },
    {
        course_id: 1,
        unit_number: 7,
        title: 'Observation',
        content: `UNIT 7: OBSERVATION

MIRROR TYPES:
1. Rear View Mirror (Interior) - Flat glass, no distortion
2. Exterior Mirrors - Convex, wider field of vision

BLIND SPOT: Area the driver cannot directly observe

Check blind spot before:
• Changing direction when motorcyclists/cyclists are close
• Overtaking on dual carriageway
• Changing lanes
• When potential hazard may be obscured

To enhance visibility:
• Check interior mirror first, then door mirror
• Look for potential hazards (vehicles behind, approaching quickly)
• A vehicle too close behind: slow earlier for more reaction time`,
        duration: '2 hours',
        key_points: ['Rear view mirror: flat glass, no distortion', 'Exterior mirrors: convex, wider view', 'Check blind spot before lane changes']
    },
    {
        course_id: 1,
        unit_number: 8,
        title: 'Vehicle Control',
        content: `UNIT 8: VEHICLE CONTROL

TO START THE VEHICLE:
1. Depress clutch pedal fully
2. Put hand brake ON
3. Turn ignition ON
4. Start motor, release key when engine starts
5. Check mirrors
6. Give proper signal
7. Select appropriate gear
8. Move handbrake OFF
9. Let clutch rise until engine speed decreases

GEAR SPEEDS:
• 1st Gear: 0-30 km/h (moving off)
• 2nd Gear: Slow traffic, downhill
• 3rd Gear: 35-70 km/h
• 4th Gear: 60-110 km/h (overtaking)
• 5th Gear: 80-110 km/h (highways)

TURNS:
• J-turn: Reverse to forward 180°
• U-turn: Forward to opposite direction`,
        duration: '6 hours',
        key_points: ['1st gear: 0-30 km/h, 5th gear: 80-110 km/h', 'J-turn: reverse to forward', 'U-turn: forward to opposite']
    },
    {
        course_id: 1,
        unit_number: 9,
        title: 'Communication on the Road',
        content: `UNIT 9: COMMUNICATION ON THE ROAD

MSM TECHNIQUE (Mirror, Signal, Manoeuvre):
1. MIRROR - Check interior mirror, then door mirror
2. SIGNAL - Apply signal to direction intended
3. MANOEUVRE - Execute the movement

TRAFFIC LIGHT SIGNALS:
• RED: STOP
• RED + AMBER: STOP, get ready
• GREEN: Go if road clear
• AMBER: STOP at the line

HAND SIGNALS:
• Left turn: Arm out, rotating forward
• Right turn: Arm out straight
• Slowing down: Arm out, moving up and down`,
        duration: '2 hours',
        key_points: ['MSM: Mirror, Signal, Manoeuvre', 'Red: STOP, Green: Go if clear', 'Hand signals for turning']
    },
    {
        course_id: 1,
        unit_number: 10,
        title: 'Speed Management',
        content: `UNIT 10: SPEED MANAGEMENT

THE 4 SECOND RULE:
When vehicle ahead passes landmark, count 4 seconds. If you pass before finishing, you're too close.

BRAKING DISTANCE: Distance from hitting brakes to complete stop

THINKING DISTANCE: Distance from deciding to brake to actually braking

STOPPING DISTANCE = Thinking Distance + Braking Distance

FREE WHEELING (COASTING):
• Moving vehicle without using power
• RISKS: Reduces control, increases brake wear, doesn't save fuel

PROGRESSIVE BRAKING is safer than freewheeling`,
        duration: '3 hours',
        key_points: ['4 Second Rule for following distance', 'Stopping = thinking + braking distance', 'Progressive braking is safer']
    },
    {
        course_id: 1,
        unit_number: 11,
        title: 'Space Management',
        content: `UNIT 11: SPACE MANAGEMENT

ROAD CONDITIONS:
• Open Condition - Clear broad view
• Closed Conditions - Limited space, restricted view
• Changing Conditions - Variable speed/road/weather

TO MANAGE SPACE:
• Drive at same speed as surrounding vehicles
• Maintain safe following distance
• Keep appropriate space envelope

SPACE RECOVERY (when insufficient space):
• Signal to indicate intention to slow
• Turn slowly to create more space
• Don't reverse (affects vehicles behind)

POSITION TO 'SEE AND BE SEEN'`,
        duration: '2 hours',
        key_points: ['Open: clear view, Closed: restricted', 'Maintain following distance', 'Position to see and be seen']
    },
    {
        course_id: 1,
        unit_number: 12,
        title: 'Emergency Manoeuvres',
        content: `UNIT 12: EMERGENCY MANOEUVRES

BRAKE FAILURE:
• Pump brake pedal to restore pressure
• If fails, apply parking brake gently

BLOWOUTS:
• Keep firm grip on steering wheel
• DON'T slam on brakes
• Let car slow gradually
• Pull to side when safe

WHEEL OFF PAVEMENT:
• Hold steering firmly
• Take foot off accelerator
• When under control, steer towards pavement

HEADLIGHTS FAIL:
• Check switch immediately
• If off, keep left, stop safely

DEFENSIVE DRIVING: Cautious driving anticipating hazards`,
        duration: '3 hours',
        key_points: ['Brake failure: pump brakes, then hand brake', 'Blowout: firm grip, no sudden braking', 'Defensive driving: anticipate hazards']
    },
    {
        course_id: 1,
        unit_number: 13,
        title: 'Skid Control and Recovery',
        content: `UNIT 13: SKID CONTROL AND RECOVERY

CAUSES OF SKIDS:
• Driving too fast for conditions
• Sudden, hard braking
• Turning too fast

TYPES OF SKIDDING:
• Front Wheel Skid - Vehicle off course
• Rear Wheel Skid - Rear swings out
• Aquaplaning - Tyres lose contact on wet roads

SKID RECOVERY:
1. Take feet off accelerator
2. Release and gently reapply brakes
3. Turn steering wheel in desired direction
4. Counter-steer as needed

AQUAPLANING PREVENTION:
• Reduce speed in wet conditions
• Correct tyre pressure
• Proper tyre tread depth`,
        duration: '2 hours',
        key_points: ['Skids from: excess speed, hard braking', 'Aquaplaning: tyres lose contact on wet roads', 'Recovery: off accelerator, gentle brakes']
    },
    {
        course_id: 1,
        unit_number: 14,
        title: 'Adverse Driving Conditions',
        content: `UNIT 14: ADVERSE DRIVING CONDITIONS

NIGHT DRIVING:
• Slow down, especially unlit roads
• Don't over-drive headlights
• Use low beams within 150m of oncoming vehicle

FOG:
• Use low beam headlights (high beams reflect off moisture)
• Don't overtake or change lanes
• If visibility decreasing, move off road

RAIN:
• Rain makes road slippery
• Smooth steering, braking, accelerating
• Leave more space between vehicles
• Stay out of puddles

EMERGENCY STEERING METHODS:
• Push-pull method - hands shuffle, no crossing
• Fixed-hand method - rapid 180° steering

ABS BRAKING: Use "plant and steer" - hold brake down and steer`,
        duration: '4 hours',
        key_points: ['Night: don\'t over-drive headlights', 'Fog: low beams, pull off if needed', 'Rain: smooth inputs, increase distance']
    },
    {
        course_id: 1,
        unit_number: 15,
        title: 'Preventive Maintenance',
        content: `UNIT 15: PREVENTIVE MAINTENANCE

MAINTENANCE INCLUDES:
• Vehicle inspection
• Lubrication
• Adjustment
• Cleaning
• Testing
• Repair

COMMON ISSUES:

Tyres/Steering:
• Puncture → Change wheel
• Heavy steering → Seek assistance
• Vibrations → Balance wheels

Brakes:
• Vehicle pulls to side → Seek assistance
• Warning light → Check fluid level

Lights:
• Lamp doesn't light → Check/replace bulb
• Irregular flashing → Check/replace fuse

Engine:
• Won't start → Check fuel, battery
• Overheating → Check coolant`,
        duration: '3 hours',
        key_points: ['PM includes inspection, lubrication, repair', 'Check tyres, brakes, lights regularly', 'Engine issues: fuel, battery, coolant']
    },
    {
        course_id: 1,
        unit_number: 16,
        title: 'Conditions of Carriage',
        content: `UNIT 16: CONDITIONS OF CARRIAGE

PSV (Public Service Vehicle) REQUIREMENTS:
• Provide statement of liability
• State fares/ticketing prices
• Indicate exceptions
• Abide by code of conduct
• Address restricted items
• Lost property procedures

LOAD LIMITS FOR CATEGORY B:
• Maximum passengers: Not more than seven
• Maximum load: GVW up to 3,500kg

LOADING GUIDELINES:
• Items as low as possible, close to centre
• Don't put items on roof without designated rack
• Don't overload
• Check tyre pressure for weight`,
        duration: '2 hours',
        key_points: ['PSV: statement of liability, fare pricing', 'Category B: max 7 passengers', 'Load low and centered']
    },
    {
        course_id: 1,
        unit_number: 17,
        title: 'Hazardous Materials',
        content: `UNIT 17: HAZARDOUS MATERIALS

CHARACTERISTICS:
• Flammable - can burn easily
• Corrosive - rusts or decomposes
• Reactive - can explode
• Toxic - poisonous

9 CLASSES OF HAZARDOUS MATERIALS:
1. Explosives
2. Gases
3. Flammable Liquids
4. Flammable Solids
5. Oxidizing Substances
6. Toxic & Infectious Substances
7. Radioactive Material
8. Corrosives
9. Miscellaneous Dangerous Goods

REQUIREMENTS:
• Driver must get legal approval
• Special equipment may be required
• Licensed by KBS, NEMA, and NTSA

DO NOT handle hazardous material without proper licensing`,
        duration: '4 hours',
        key_points: ['Hazardous: flammable, corrosive, reactive, toxic', '9 classes from Explosives to Miscellaneous', 'Need special licensing']
    },
    {
        course_id: 1,
        unit_number: 18,
        title: 'Emergency Procedures',
        content: `UNIT 18: EMERGENCY PROCEDURES

STEPS AT CRASH SCENE:
1. Set reflector triangles 50m behind and ahead
2. Call emergency services (police, ambulance)
3. Move uninjured people to safety
4. DON'T move injured unless immediate danger
5. Stay at scene until police arrive

FIRST AID - Dr. A.B.C:
• D = Danger: Make safe
• R = Response: Check for response
• A = Airway: Clear throat
• B = Breathing: Check for 10 seconds
• C = Circulation: Check pulse

RECOVERY POSITION:
• Stable position on side to prevent choking

BLEEDING TREATMENT:
• Apply firm pressure over wound
• Raise bleeding limb if no broken bones`,
        duration: '3 hours',
        key_points: ['Reflector triangles 50m behind/ahead', 'Dr. A.B.C: Danger, Response, Airway, Breathing, Circulation', 'Apply pressure to bleeding wounds']
    },
    {
        course_id: 1,
        unit_number: 19,
        title: 'Work Planning',
        content: `UNIT 19: WORK PLANNING

PREPARING FOR JOURNEY:
• Name, address, phone of sender
• Pick-up phone number
• Appointment time
• Requirements for securing load

MANAGING THE TRIP:
• Distance (may need co-driver for long trips)
• Time/Traffic conditions
• Meals (plan ahead)
• Fatigue (don't start tired)
• Weather conditions

LEGAL LIMITS (Traffic Act 66A):
• No person shall drive PSV/commercial vehicle for more than 8 hours in 24-hour period

COMPLETING RECORDS:
• Provide summarized record of trip
• Work tickets or trip cards`,
        duration: '2 hours',
        key_points: ['Plan: contact info, appointment', 'Legal limit: max 8 hours driving', 'Complete trip records']
    },
    {
        course_id: 1,
        unit_number: 20,
        title: 'Customer Care',
        content: `UNIT 20: CUSTOMER CARE

ESSENTIAL SKILLS:
• Communication skills
• Handling customer expectations
• Handling customers with special needs
• Knowledge of sexual harassment and discrimination

COURTESY ON THE ROAD:
• Get proper training and license
• Apply road safety techniques
• Have positive attitude
• Take responsibility for actions
• Keep vehicle and number plates clean

BEFORE TRIP:
• Pick/drop off at appropriate points
• Provide sufficient time for boarding/alighting
• Assist passengers who need help
• Address customers respectfully

SEXUAL HARASSMENT:
• Unwelcome requests for sexual contact
• Spoken/written language of sexual nature

RESPONSE:
• Speak up, address with authority
• Seek assistance from police`,
        duration: '2 hours',
        key_points: ['Essential: communication, handling expectations', 'Be courteous, visible, responsible', 'Report harassment to authority']
    },
    {
        course_id: 1,
        unit_number: 21,
        title: 'The Examination - 1000 Quiz Bank',
        content: `UNIT 21: THE EXAMINATION - 1000 QUIZ BANK

To get your driving licence, follow NTSA registration procedure.

PREPARATION:
• Prepare for practical and theory exam
• Study all 20 previous units
• Review traffic signs and model town
• Practice with quiz bank

ON EXAM DAY:
• Go to examination centre on time
• Bring required documents

EXAM COVERS:
• All 20 units from Introduction to Customer Care
• Traffic signs (regulatory, warning, information)
• Model town illustrations and rules
• Highway Code and Traffic Act

QUIZ BANK FEATURES:
• 1000+ practice questions
• Multiple choice format
• Answers with explanations
• Covers all exam topics`,
        duration: '10 hours',
        key_points: ['Follow NTSA registration', 'Study all 20 units and traffic signs', '1000+ practice questions available']
    }
];

// ============================================
// PUSH FUNCTION
// ============================================
async function pushAllMaterial() {
    console.log('🚀 Pushing all course material to Supabase...\n');
    
    let totalSuccess = 0;
    let totalErrors = 0;
    
    // 1. Push Courses
    console.log('📚 Pushing 8 courses...');
    for (const course of courses) {
        try {
            const { error } = await supabase
                .from('courses')
                .upsert(course, { onConflict: 'id' });
            
            if (error) throw error;
            console.log(`   ✅ Course ${course.id}: ${course.title}`);
            totalSuccess++;
        } catch (error) {
            console.error(`   ❌ Course ${course.id}: ${error.message}`);
            totalErrors++;
        }
    }
    
    // 2. Push Learner Hub Units
    console.log('\n📖 Pushing Learner Hub units (21 units)...');
    for (const unit of learnerHubUnits) {
        try {
            const { error } = await supabase
                .from('course_units')
                .upsert(unit, { onConflict: 'course_id, unit_number' });
            
            if (error) throw error;
            console.log(`   ✅ Unit ${unit.unit_number}: ${unit.title}`);
            totalSuccess++;
        } catch (error) {
            console.error(`   ❌ Unit ${unit.unit_number}: ${error.message}`);
            totalErrors++;
        }
    }
    
    // 3. Verification
    console.log('\n🔍 Verifying data...');
    
    const { data: verifyCourses } = await supabase
        .from('courses')
        .select('id, title')
        .order('id');
    
    const { data: verifyUnits } = await supabase
        .from('course_units')
        .select('unit_number, title')
        .eq('course_id', 1)
        .order('unit_number');
    
    console.log('\n📊 SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`✅ Total successful: ${totalSuccess}`);
    console.log(`❌ Total errors: ${totalErrors}`);
    console.log('=' .repeat(50));
    
    console.log('\n📚 Courses in database:');
    verifyCourses?.forEach(c => console.log(`   ${c.id}. ${c.title}`));
    
    console.log(`\n📖 Learner Hub units in database: ${verifyUnits?.length || 0}/21`);
    if (verifyUnits && verifyUnits.length === 21) {
        console.log('   ✅ All 21 units successfully loaded!');
    } else if (verifyUnits) {
        console.log(`   ⚠️ Only ${verifyUnits.length} of 21 units loaded`);
    } else {
        console.log('   ❌ No units found in database');
    }
    
    console.log('\n🎉 Push complete!');
}

// Run the function
pushAllMaterial();
