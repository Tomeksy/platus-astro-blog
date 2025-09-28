#!/usr/bin/env node

/**
 * Script to populate knowledge_base with sample Platus product data
 * Run with: node populate-sample-knowledge.js
 */

import dotenv from 'dotenv';
import OpenAIService from './src/services/openai.js';
import SupabaseService from './src/services/supabase.js';

dotenv.config();

console.log('🔄 Starting Knowledge Base Population\n');
console.log('=' .repeat(60));

// Sample Platus knowledge data
const sampleKnowledge = [
  {
    content: `Die Grid Pad Serie von Smartbox ist eine hochmoderne Kommunikationslösung mit Augensteuerung. 
    Diese Windows-Tablets ermöglichen Menschen mit motorischen Einschränkungen vollständige digitale Teilhabe. 
    Mit der integrierten Tobii Augensteuerung können Nutzer nur mit ihren Augen den Computer bedienen, 
    kommunizieren und ihre Umgebung kontrollieren. Die Geräte sind robust, portabel und für den täglichen 
    Einsatz konzipiert. Verfügbar in verschiedenen Displaygrößen: 10", 12" und 15".`,
    metadata: {
      product_name: 'Grid Pad Serie',
      section: 'Produktübersicht',
      category: 'Kommunikationshilfen',
      manufacturer: 'Smartbox',
      target_group: 'Menschen mit ALS, Zerebralparese, Locked-in-Syndrom'
    }
  },
  {
    content: `Grid 3 ist die führende Software für Unterstützte Kommunikation (UK). 
    Sie bietet Symbolkommunikation, Textkommunkation und Umfeldsteuerung in einem System. 
    Mit Grid 3 können Benutzer sprechen, SMS versenden, E-Mails schreiben, im Internet surfen, 
    soziale Medien nutzen und Smart Home Geräte steuern. Die Software ist vollständig anpassbar 
    und wächst mit den Fähigkeiten des Nutzers mit. Über 25.000 Symbole und vorgefertigte 
    Kommunikationsseiten ermöglichen einen schnellen Start.`,
    metadata: {
      product_name: 'Grid 3',
      section: 'Software-Features',
      category: 'UK-Software',
      manufacturer: 'Smartbox',
      compatibility: 'Windows, iPad, Android'
    }
  },
  {
    content: `Die Kostenübernahme für Sprachcomputer und Kommunikationshilfen erfolgt in Österreich 
    über verschiedene Kostenträger. Die Österreichische Gesundheitskasse (ÖGK) übernimmt bei 
    medizinischer Notwendigkeit die Kosten für Hilfsmittel. Wichtig ist eine fachärztliche 
    Verordnung und oft eine logopädische Stellungnahme. Platus unterstützt bei der gesamten 
    Beantragung und erstellt kostenlose Kostenvoranschläge. Die Bearbeitungszeit beträgt 
    üblicherweise 4-8 Wochen. Bei Ablehnung hilft Platus beim Einspruch.`,
    metadata: {
      product_name: 'Kostenübernahme',
      section: 'Finanzierung',
      category: 'Beratung',
      service: 'Platus Unterstützung',
      region: 'Österreich'
    }
  },
  {
    content: `Augensteuerung ermöglicht die Bedienung von Computern ausschließlich mit den Augen. 
    Moderne Eye-Tracking-Systeme wie Tobii PCEye 5 oder Tobii Dynavox I-Serie erfassen die 
    Augenbewegungen mit Infrarot-Kameras. Die Genauigkeit liegt bei unter 1cm auf normale 
    Bildschirmdistanz. Kalibrierung dauert nur 30 Sekunden. Die Technologie funktioniert mit 
    Brille, Kontaktlinsen und bei verschiedenen Lichtverhältnissen. Ideal für Menschen mit 
    ALS, hoher Querschnittlähmung oder Zerebralparese.`,
    metadata: {
      product_name: 'Augensteuerung',
      section: 'Technologie',
      category: 'Eingabemethoden',
      manufacturers: 'Tobii, Alea Technologies',
      accuracy: '< 1cm'
    }
  },
  {
    content: `speaKI ist der innovative KI-Berater von Platus für Hilfsmittelfragen. Als digitaler 
    Assistent ist speaKI rund um die Uhr verfügbar und beantwortet Fragen zu Kommunikationshilfen, 
    Finanzierung und Unterstützter Kommunikation. speaKI nutzt modernste KI-Technologie und das 
    umfangreiche Fachwissen von Platus mit über 21 Jahren Erfahrung. Der Service ist kostenlos 
    und bietet erste Orientierung bei der Hilfsmittelsuche. Verfügbar unter speaki.io.`,
    metadata: {
      product_name: 'speaKI',
      section: 'Digitale Beratung',
      category: 'Services',
      provider: 'Platus',
      availability: '24/7',
      website: 'https://speaki.io'
    }
  },
  {
    content: `Menschen mit Amyotropher Lateralsklerose (ALS) verlieren oft die Fähigkeit zu sprechen. 
    Sprachcomputer sind dann lebenswichtig für die Kommunikation. Bei ALS empfiehlt sich eine 
    frühzeitige Versorgung, noch während Restfunktionen vorhanden sind. Augensteuerung wird 
    wichtig, wenn Hände nicht mehr nutzbar sind. Platus bietet spezielle ALS-Beratung mit 
    Hausbesuchen und Leihgeräten für die Erprobung. Banking-Stimme kann die eigene Stimme 
    für später konservieren.`,
    metadata: {
      product_name: 'ALS-Versorgung',
      section: 'Krankheitsspezifisch',
      category: 'Beratung',
      disease: 'ALS',
      services: 'Hausbesuche, Leihgeräte, Stimmbanking'
    }
  }
];

async function populateKnowledge() {
  try {
    // Check if Supabase is connected
    if (!SupabaseService.client) {
      console.error('❌ Supabase client not initialized');
      console.log('Please check your .env file for SUPABASE_URL and keys');
      process.exit(1);
    }
    
    console.log('✅ Connected to Supabase\n');
    
    // Process each knowledge item
    for (const [index, item] of sampleKnowledge.entries()) {
      console.log(`\n[${index + 1}/${sampleKnowledge.length}] Processing: ${item.metadata.product_name}`);
      
      try {
        // Generate embedding
        console.log('  🔄 Generating embedding...');
        const embedding = await OpenAIService.createEmbedding(item.content);
        
        if (!embedding || embedding.length === 0) {
          console.error('  ❌ Failed to generate embedding');
          continue;
        }
        
        console.log(`  ✅ Embedding generated (${embedding.length} dimensions)`);
        
        // Insert into Supabase
        console.log('  🔄 Inserting into knowledge_base...');
        const { data, error } = await SupabaseService.client
          .from('knowledge_base')
          .insert({
            content: item.content,
            embedding: embedding,
            metadata: item.metadata
          })
          .select();
        
        if (error) {
          console.error('  ❌ Insert failed:', error.message);
          continue;
        }
        
        console.log('  ✅ Successfully added to knowledge_base');
        
      } catch (error) {
        console.error(`  ❌ Error processing item:`, error.message);
      }
    }
    
    // Verify the data was added
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION');
    console.log('='.repeat(60));
    
    const { data: count } = await SupabaseService.client
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n✅ Total records in knowledge_base: ${count}`);
    
    // Test semantic search
    console.log('\n🔍 Testing semantic search for "Grid Pad"...');
    const results = await SupabaseService.semanticSearch('Grid Pad Serie', {
      limit: 3,
      threshold: 0.4
    });
    
    if (results && results.length > 0) {
      console.log(`✅ Search returned ${results.length} results`);
      results.forEach((result, idx) => {
        console.log(`  ${idx + 1}. Similarity: ${result.similarity?.toFixed(3)} - ${result.metadata?.product_name}`);
      });
    } else {
      console.log('⚠️  Search returned no results');
    }
    
    console.log('\n✅ Knowledge base population complete!');
    console.log('\nYou can now try generating articles:');
    console.log('curl -X POST http://localhost:3001/api/generate \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"topic": "Grid Pad Serie", "intent": "educational"}\'');
    
  } catch (error) {
    console.error('\n❌ Population failed:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

populateKnowledge();
